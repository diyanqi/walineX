import type { Comment, Instance, Notification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/lib/plans";
import { decryptSecret } from "@/lib/crypto";
import { sendWechatMessage } from "@/lib/wechat";

type NotificationKind = "new_comment" | "reply" | "moderation";

interface EnqueueOptions {
  instance: Instance;
  type: NotificationKind;
  comment: Comment;
  parentComment?: Comment | null;
}

function buildNotification(
  options: EnqueueOptions,
): { subject: string; body: string } | null {
  const { instance, type, comment, parentComment } = options;
  if (type === "moderation") {
    if (!instance.notifyModeration) return null;
    return {
      subject: `${instance.name} 有评论需要审核`,
      body: `${comment.nick} 在 ${comment.url} 留言：\n\n${comment.comment}`,
    };
  }
  if (type === "reply") {
    if (!instance.notifyReply) return null;
    const parent = parentComment;
    const target = parent?.nick ? `${parent.nick} 的评论` : "你的评论";
    return {
      subject: `${instance.name} 有新回复`,
      body: `${comment.nick} 回复了 ${target}：\n\n${comment.comment}`,
    };
  }
  if (!instance.notifyNewComment) return null;
  return {
    subject: `${instance.name} 收到了新评论`,
    body: `${comment.nick} 在 ${comment.url} 留言：\n\n${comment.comment}`,
  };
}

export async function enqueueNotification(options: EnqueueOptions): Promise<void> {
  const { instance } = options;
  const payload = buildNotification(options);
  if (!payload) return;
  if (
    !instance.wechatNotificationEnabled ||
    !instance.wechatBotTokenEncrypted ||
    !instance.wechatBaseUrl ||
    !instance.wechatUserId
  ) {
    return;
  }

  const owner = await prisma.user.findUnique({
    where: { id: instance.userId },
    select: { plan: true },
  });
  if (!owner || !planLimits(owner.plan).wechatNotifications) return;

  const notification = await prisma.notification.create({
    data: {
      instanceId: instance.id,
      userId: instance.userId,
      type: options.type,
      recipientWechatId: instance.wechatUserId,
      channel: "wechat",
      subject: payload.subject,
      body: payload.body,
      status: "pending",
      commentId: options.comment.objectId,
    },
  });

  void deliverNotification(notification, instance).catch(async (error) => {
    console.error("WeChat notification failed", error);
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      },
    });
  });
}

async function deliverNotification(
  notification: Notification,
  instance: Instance,
): Promise<void> {
  const botToken = decryptSecret(instance.wechatBotTokenEncrypted);
  if (!botToken || !instance.wechatBaseUrl || !instance.wechatUserId) {
    throw new Error("微信通知未绑定完整");
  }
  await sendWechatMessage({
    baseUrl: instance.wechatBaseUrl,
    botToken,
    userId: instance.wechatUserId,
    text: `${notification.subject}\n\n${notification.body}`,
  });
  await prisma.notification.update({
    where: { id: notification.id },
    data: { status: "sent", sentAt: new Date() },
  });
}
