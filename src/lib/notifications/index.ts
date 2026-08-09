import nodemailer from "nodemailer";
import type { Comment, Instance } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/lib/plans";

type NotificationKind = "new_comment" | "reply" | "moderation";

let queuePromise: Promise<import("bullmq").Queue | null> | null = null;

async function getEmailQueue(): Promise<import("bullmq").Queue | null> {
  if (env("REDIS_ENABLED", "false") !== "true") return null;
  if (queuePromise) return queuePromise;
  queuePromise = (async () => {
    try {
      const { Queue } = await import("bullmq");
      const { default: Redis } = await import("ioredis");
      const connection = new Redis(env("REDIS_URL", "redis://localhost:6379"), {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      return new Queue("walinex-emails", { connection });
    } catch (error) {
      console.error("Failed to initialize email queue", error);
      queuePromise = null;
      return null;
    }
  })();
  return queuePromise;
}

interface EnqueueOptions {
  instance: Instance;
  type: NotificationKind;
  comment: Comment;
  parentComment?: Comment | null;
}

export interface QueuedEmailJob {
  notificationId?: string;
  userId?: string;
  instanceId?: string;
  to: string;
  subject: string;
  body: string;
}

function buildNotification(
  options: EnqueueOptions,
): { enabled: boolean; recipient?: string; subject: string; body: string; to: string } | null {
  const { instance, type, comment, parentComment } = options;
  const ownerEmail = instance.notificationEmail || undefined;
  if (type === "moderation") {
    if (!ownerEmail || !instance.notifyModeration) return null;
    return {
      enabled: true,
      to: ownerEmail,
      subject: `${instance.name} 有评论需要审核`,
      body: `${comment.nick} 在 ${comment.url} 留言：\n\n${comment.comment}`,
    };
  }
  if (type === "reply" && parentComment?.mail) {
    if (!instance.notifyReply) return null;
    return {
      enabled: true,
      to: parentComment.mail,
      subject: `你在 ${instance.name} 收到了新回复`,
      body: `${comment.nick} 回复了你：\n\n${comment.comment}`,
    };
  }
  if (!ownerEmail || !instance.notifyNewComment) return null;
  return {
    enabled: true,
    to: ownerEmail,
    subject: `${instance.name} 收到了新评论`,
    body: `${comment.nick} 在 ${comment.url} 留言：\n\n${comment.comment}`,
  };
}

export async function enqueueNotification(options: EnqueueOptions): Promise<void> {
  const payload = buildNotification(options);
  if (!payload) return;

  const owner = await prisma.user.findUnique({
    where: { id: options.instance.userId },
    select: { plan: true },
  });
  if (!owner || !planLimits(owner.plan).emailNotifications) return;

  const notification = await prisma.notification.create({
    data: {
      instanceId: options.instance.id,
      userId: options.instance.userId,
      type: options.type,
      recipientEmail: payload.to,
      subject: payload.subject,
      body: payload.body,
      status: "pending",
      commentId: options.comment.objectId,
    },
  });

  const queue = await getEmailQueue();
  if (queue) {
    try {
      await queue.add(
        "send",
        {
          notificationId: notification.id,
          userId: options.instance.userId,
          instanceId: options.instance.id,
          ...payload,
        } satisfies QueuedEmailJob,
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: 500,
          removeOnFail: 500,
        },
      );
      return;
    } catch (error) {
      console.error("Failed to enqueue email notification", error);
    }
  }

  void sendPendingNotifications();
}

function createTransport() {
  return nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT", "587")),
    secure: env("SMTP_PORT", "587") === "465",
    auth: env("SMTP_USER")
      ? { user: env("SMTP_USER"), pass: env("SMTP_PASS") }
      : undefined,
  });
}

export async function sendQueuedEmail(payload: QueuedEmailJob): Promise<void> {
  const transport = createTransport();
  await transport.sendMail({
    from: env("SMTP_FROM", "无尽书证 <noreply@waline.infvar.com>"),
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
  });
  await prisma.$transaction([
    prisma.emailLog.create({
      data: {
        userId: payload.userId,
        instanceId: payload.instanceId,
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        status: "sent",
        sentAt: new Date(),
      },
    }),
    ...(payload.notificationId
      ? [
          prisma.notification.update({
            where: { id: payload.notificationId },
            data: { status: "sent", sentAt: new Date() },
          }),
        ]
      : []),
  ]);
}

export async function sendPendingNotifications(limit = 20): Promise<void> {
  const pending = await prisma.notification.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  if (pending.length === 0) return;

  for (const notification of pending) {
    try {
      await sendQueuedEmail({
        notificationId: notification.id,
        userId: notification.userId,
        instanceId: notification.instanceId,
        to: notification.recipientEmail,
        subject: notification.subject,
        body: notification.body,
      });
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        },
      });
    }
  }
}
