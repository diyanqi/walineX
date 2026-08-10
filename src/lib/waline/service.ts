import type { Comment, CommentStatus, Instance, Prisma, User } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { renderCommentMarkdown } from "@/lib/waline/markdown";
import { parseUserAgent } from "@/lib/waline/ua";
import { commentLevel, identityFromUser } from "@/lib/waline/identity";
import {
  serializeChild,
  serializeComment,
  serializeRoot,
} from "@/lib/waline/serialize";
import type { WalineSerializeOptions } from "@/lib/waline/serialize";
import type {
  WalineCommentData,
  WalineCommentStatus,
  WalineRootComment,
  WalineUser,
} from "@/lib/waline/types";
import { rateLimit } from "@/lib/ratelimit";
import { verifyOptionalCap } from "@/lib/cap";
import { moderateComment } from "@/lib/moderation";
import { enqueueNotification } from "@/lib/notifications";
import { assertCommentCapacity } from "@/lib/usage";

export interface CommentListParams {
  instance: Instance;
  path: string;
  page: number;
  pageSize: number;
  isOwner: boolean;
  userId?: string | null;
  sortBy?: string;
}

function visibleWhere(
  instanceId: string,
  isOwner: boolean,
  userId?: string | null,
): Prisma.CommentWhereInput {
  const where: Prisma.CommentWhereInput = {
    instanceId,
    deletedAt: null,
  };
  if (!isOwner) {
    if (userId) {
      where.OR = [{ status: "approved" }, { userId }];
    } else {
      where.status = "approved";
    }
  }
  return where;
}

async function buildSerializeOptions(
  instance: Instance,
  comments: Comment[],
  opts: { isOwner: boolean; login: boolean },
): Promise<WalineSerializeOptions> {
  const userIds = [...new Set(comments.map((comment) => comment.userId).filter(Boolean))] as string[];
  const mails = [...new Set(comments.map((comment) => comment.mail).filter(Boolean))] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } } })
    : [];
  const identityByUserId = new Map(
    users.map((user) => [user.id, identityFromUser(user, instance.userId)]),
  );
  const levelByObjectId = new Map<number, number>();
  if (comments.length > 0) {
    const statusWhere: Prisma.CommentWhereInput = {
      instanceId: instance.id,
      deletedAt: null,
      status: { notIn: ["waiting", "spam"] },
    };
    const [userCounts, mailCounts] = await Promise.all([
      userIds.length > 0
        ? prisma.comment.groupBy({
            by: ["userId"],
            where: { ...statusWhere, userId: { in: userIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      mails.length > 0
        ? prisma.comment.groupBy({
            by: ["mail"],
            where: { ...statusWhere, mail: { in: mails } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);
    const countByUserId = new Map(userCounts.map((row) => [row.userId, row._count._all]));
    const countByMail = new Map(
      mailCounts
        .filter((row) => row.mail)
        .map((row) => [(row.mail as string).toLowerCase(), row._count._all]),
    );
    for (const comment of comments) {
      const count = comment.userId
        ? countByUserId.get(comment.userId)
        : comment.mail
          ? countByMail.get(comment.mail.toLowerCase())
          : undefined;
      if (count) levelByObjectId.set(comment.objectId, commentLevel(count));
    }
  }
  return {
    isOwner: opts.isOwner,
    login: opts.login,
    identityByUserId,
    levelByObjectId,
  };
}

export async function listComments(params: CommentListParams) {
  const { instance, path, isOwner, userId } = params;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const [sortField = "insertedAt", sortDirection = "desc"] = String(
    params.sortBy || "insertedAt_desc",
  ).split("_");
  const orderColumn = sortField === "like" ? "like" : "createdAt";
  const direction = sortDirection === "asc" ? "asc" : "desc";
  const baseWhere = { ...visibleWhere(instance.id, isOwner, userId), url: path };
  const [count, roots] = await Promise.all([
    prisma.comment.count({ where: { ...baseWhere, pid: null } }),
    prisma.comment.findMany({
      where: { ...baseWhere, pid: null },
      orderBy: [{ sticky: "desc" }, { [orderColumn]: direction }, { objectId: direction }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  if (roots.length === 0) {
    return {
      errno: 0 as const,
      data: [] as WalineRootComment[],
      page,
      totalPages: Math.ceil(count / pageSize),
      pageSize,
      count,
    };
  }

  const rootIds = roots.map((root) => root.objectId);
  const children = await prisma.comment.findMany({
    where: {
      ...visibleWhere(instance.id, isOwner, userId),
      url: path,
      deletedAt: null,
      OR: [{ rid: { in: rootIds } }, { pid: { in: rootIds } }],
    },
    orderBy: { createdAt: "asc" },
  });

  const parentIds = children
    .map((child) => child.pid)
    .filter((id): id is number => Boolean(id));
  const parentById = new Map<number, Comment>();
  if (parentIds.length > 0) {
    const parents = await prisma.comment.findMany({
      where: { objectId: { in: parentIds } },
    });
    for (const parent of parents) parentById.set(parent.objectId, parent);
  }

  const childrenByRoot = new Map<number, Comment[]>();
  for (const child of children) {
    const rootId = child.rid ?? child.pid;
    if (!rootId) continue;
    const list = childrenByRoot.get(rootId) ?? [];
    list.push(child);
    childrenByRoot.set(rootId, list);
  }

  const serializeOptions = await buildSerializeOptions(
    instance,
    [...roots, ...children],
    { isOwner, login: Boolean(userId) },
  );

  return {
    errno: 0 as const,
    data: roots.map((root) =>
      serializeRoot(
        root,
        childrenByRoot.get(root.objectId) ?? [],
        parentById,
        serializeOptions,
      ),
    ),
    page,
    totalPages: Math.ceil(count / pageSize),
    pageSize,
    count: await prisma.comment.count({ where: baseWhere }),
  };
}

export async function countComments(
  instanceId: string,
  paths: string[],
  options: { isOwner: boolean; userId?: string | null } = { isOwner: false },
) {
  const groups = await prisma.comment.groupBy({
    by: ["url"],
    where: {
      ...visibleWhere(instanceId, options.isOwner, options.userId),
      url: { in: paths },
    },
    _count: { _all: true },
  });
  const counts = new Map(groups.map((group) => [group.url, group._count._all]));
  return paths.map((path) => counts.get(path) ?? 0);
}

export async function recentComments(
  instance: Instance,
  count: number,
  isOwner: boolean,
  userId?: string | null,
) {
  const comments = await prisma.comment.findMany({
    where: visibleWhere(instance.id, isOwner, userId),
    orderBy: { createdAt: "desc" },
    take: Math.min(50, Math.max(1, count || 10)),
  });
  const serializeOptions = await buildSerializeOptions(instance, comments, {
    isOwner,
    login: Boolean(userId),
  });
  return comments.map((comment) => ({
    ...serializeComment(comment, serializeOptions),
    url: comment.url,
  }));
}

export interface CreateCommentInput extends WalineCommentData {
  ip?: string;
  authorUserId?: string | null;
}

function anonymousUserKey(comment: Pick<Comment, "nick" | "mail">): string {
  return `${comment.nick}:${comment.mail || ""}`;
}

export async function createComment(
  instance: Instance,
  input: CreateCommentInput,
  meta: { ip: string; isOwner: boolean },
) {
  const { ip, isOwner } = meta;
  const limit = await rateLimit(
    `comment:${instance.slug}:${ip}`,
    isOwner ? 60 : instance.commentRateLimitMax,
    instance.commentRateLimitWindowSec,
  );
  if (!limit.allowed) {
    return { error: { errno: 429, errmsg: "评论太快，请稍后再试。" } };
  }

  const cap = await verifyOptionalCap(input);
  if (!cap.success) {
    return { error: { errno: 400, errmsg: "人机验证失败，请刷新页面后重试。" } };
  }

  const capacity = await assertCommentCapacity(instance);
  if (!capacity.ok) {
    return { error: { errno: 403, errmsg: capacity.message || "评论额度已用完。" } };
  }

  const nick = input.nick?.trim().slice(0, 50);
  const mail = input.mail?.trim().slice(0, 200) || null;
  const link = input.link?.trim().slice(0, 500) || null;
  const content = input.comment?.trim().slice(0, 10_000);
  const url = input.url?.trim().slice(0, 1_000) || "/";
  const ua = input.ua?.slice(0, 500) || "";

  if (!nick || !content) {
    return { error: { errno: 400, errmsg: "昵称和评论内容不能为空。" } };
  }
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { error: { errno: 400, errmsg: "邮箱格式不正确。" } };
  }
  if (link && !/^https?:\/\//i.test(link)) {
    return { error: { errno: 400, errmsg: "网址必须以 http(s) 开头。" } };
  }
  if (!instance.allowAnonymous && !isOwner && !input.authorUserId) {
    return { error: { errno: 403, errmsg: "该实例已关闭匿名评论。" } };
  }

  const duplicate = await prisma.comment.findFirst({
    where: {
      instanceId: instance.id,
      url,
      nick,
      mail,
      comment: content,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  if (duplicate) {
    return { error: { errno: 400, errmsg: "检测到重复内容，请勿重复提交。" } };
  }

  const pid = input.pid ? Number(input.pid) : undefined;
  let rid = input.rid ? Number(input.rid) : undefined;
  if (pid && Number.isInteger(pid)) {
    const parent = await prisma.comment.findUnique({
      where: { objectId: pid },
    });
    if (!parent || parent.instanceId !== instance.id || parent.deletedAt) {
      return { error: { errno: 400, errmsg: "回复的评论不存在。" } };
    }
    if (!rid || !Number.isInteger(rid)) rid = parent.rid ?? parent.objectId;
  }

  const moderation = await moderateComment(instance, {
    content,
    nick,
    mail,
    link,
    url,
    ip,
  });
  if (moderation.blocked) {
    return { error: { errno: 403, errmsg: moderation.reason || "评论已被拦截。" } };
  }

  const status: WalineCommentStatus = isOwner
    ? "approved"
    : moderation.spam
      ? "spam"
      : moderation.review || instance.moderationEnabled
        ? "waiting"
        : instance.defaultCommentStatus;

  const comment = await prisma.comment.create({
    data: {
      instanceId: instance.id,
      userId: input.authorUserId ?? null,
      url,
      nick,
      mail,
      link,
      comment: content,
      rendered: moderation.rendered ?? renderCommentMarkdown(content),
      ua,
      ipHash: ip ? createHash("sha256").update(`${instance.id}:${ip}`).digest("hex") : null,
      ip,
      addr: isOwner ? "本地" : null,
      ...parseUserAgent(ua),
      status,
      pid: pid && Number.isInteger(pid) ? pid : null,
      rid: rid && Number.isInteger(rid) ? rid : null,
      at: input.at?.slice(0, 100) || null,
      spamScore: moderation.score ?? null,
      moderationReason: moderation.reason || null,
    },
  });

  const month = new Date().toISOString().slice(0, 7);
  await prisma.usageRecord.upsert({
    where: { instanceId_month: { instanceId: instance.id, month } },
    create: { instanceId: instance.id, userId: instance.userId, month, commentCount: 1 },
    update: { commentCount: { increment: 1 } },
  });

  if (status !== "spam") {
    await enqueueNotification({
      instance,
      type: status === "waiting" ? "moderation" : pid ? "reply" : "new_comment",
      comment,
      parentComment: pid ? await prisma.comment.findUnique({ where: { objectId: pid! } }) : undefined,
    });
  }

  const parent = pid ? await prisma.comment.findUnique({ where: { objectId: pid } }) : null;
  const serializeOptions = await buildSerializeOptions(
    instance,
    parent ? [comment, parent] : [comment],
    { isOwner, login: Boolean(input.authorUserId) },
  );
  const data =
    pid && parent
      ? serializeChild(comment, parent, serializeOptions)
      : serializeRoot(comment, [], new Map(), serializeOptions);
  return { data };
}

export async function updateComment(
  instance: Instance,
  objectId: number,
  body: Record<string, unknown>,
  meta: { ip: string; isOwner: boolean },
  user?: User | null,
) {
  const existing = await prisma.comment.findFirst({
    where: { objectId, instanceId: instance.id, deletedAt: null },
  });
  if (!existing) return { error: { errno: 404, errmsg: "评论不存在。" } };

  if (typeof body.like === "boolean") {
    const key = `ip:${meta.ip}`;
    try {
      await prisma.commentReaction.create({
        data: { commentId: objectId, key, reaction: "like" },
      });
    } catch {
      return { error: { errno: 400, errmsg: "已经点过赞了。" } };
    }
    const updated = await prisma.comment.update({
      where: { objectId },
      data: { like: existing.like + (body.like ? 1 : -1) },
    });
    const serializeOptions = await buildSerializeOptions(instance, [updated], {
      isOwner: meta.isOwner,
      login: Boolean(user),
    });
    return { data: serializeComment(updated, serializeOptions) };
  }

  const isAuthor = Boolean(user && existing.userId === user.id);
  if (!meta.isOwner && !isAuthor) {
    return { error: { errno: 403, errmsg: "只有评论作者或实例管理员可以修改评论。" } };
  }

  const data: Prisma.CommentUpdateInput = {};
  if (meta.isOwner) {
    if (typeof body.status === "string") {
      data.status = body.status as CommentStatus;
      data.moderatedBy = "admin";
      data.moderatedAt = new Date();
    }
    if (typeof body.sticky === "number" || typeof body.sticky === "boolean") {
      data.sticky = Boolean(body.sticky);
    }
  }
  if (typeof body.comment === "string" && body.comment.trim()) {
    data.comment = body.comment.trim().slice(0, 10_000);
    data.rendered = renderCommentMarkdown(data.comment);
  }
  if (Object.keys(data).length === 0) {
    return { error: { errno: 400, errmsg: "没有可更新的字段。" } };
  }
  const updated = await prisma.comment.update({ where: { objectId }, data });
  const serializeOptions = await buildSerializeOptions(instance, [updated], {
    isOwner: meta.isOwner,
    login: Boolean(user),
  });
  return { data: serializeComment(updated, serializeOptions) };
}

export async function deleteComment(
  instance: Instance,
  objectId: number,
  user?: User | null,
) {
  const existing = await prisma.comment.findFirst({
    where: { objectId, instanceId: instance.id, deletedAt: null },
  });
  if (!existing) return { error: { errno: 404, errmsg: "评论不存在。" } };
  const isOwner = instance.userId === user?.id;
  const isAuthor = Boolean(existing.userId && existing.userId === user?.id);
  if (!isOwner && !isAuthor) {
    return { error: { errno: 403, errmsg: "只有评论作者或实例管理员可以删除评论。" } };
  }
  await prisma.comment.update({
    where: { objectId },
    data: { deletedAt: new Date() },
  });
  return { data: "" as const };
}

export async function adminCommentList(
  instance: Instance,
  params: { page?: number; pageSize?: number; status?: string; keyword?: string },
) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const where: Prisma.CommentWhereInput = {
    instanceId: instance.id,
    deletedAt: null,
    ...(params.status ? { status: params.status as CommentStatus } : {}),
    ...(params.keyword
      ? {
          OR: [
            { nick: { contains: params.keyword, mode: "insensitive" } },
            { comment: { contains: params.keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [count, data, spamCount, waitingCount] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.comment.count({ where: { instanceId: instance.id, status: "spam" } }),
    prisma.comment.count({ where: { instanceId: instance.id, status: "waiting" } }),
  ]);
  const serializeOptions = await buildSerializeOptions(instance, data, {
    isOwner: true,
    login: false,
  });
  return {
    data: data.map((comment) => serializeComment(comment, serializeOptions)),
    count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
    spamCount,
    waitingCount,
  };
}

export async function userList(instance: Instance, pageSize: number) {
  const comments = await prisma.comment.findMany({
    where: {
      instanceId: instance.id,
      deletedAt: null,
      status: { notIn: ["waiting", "spam"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20_000,
    select: { userId: true, nick: true, mail: true, link: true, avatar: true },
  });
  const userIds = [
    ...new Set(comments.map((comment) => comment.userId).filter(Boolean)),
  ] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } } })
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const countByUserId = new Map<string, number>();
  const anonymous = new Map<string, { count: number; comment: (typeof comments)[number] }>();

  for (const comment of comments) {
    if (comment.userId && userById.has(comment.userId)) {
      countByUserId.set(comment.userId, (countByUserId.get(comment.userId) ?? 0) + 1);
      continue;
    }
    const key = anonymousUserKey(comment);
    const existing = anonymous.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    anonymous.set(key, { count: 1, comment });
  }

  const result: WalineUser[] = [];
  for (const user of users) {
    const count = countByUserId.get(user.id) ?? 0;
    if (count === 0) continue;
    const identity = identityFromUser(user, instance.userId);
    result.push({
      count,
      nick: identity.nick,
      link: identity.link,
      avatar: identity.avatar,
      level: commentLevel(count),
      ...(identity.label ? { label: identity.label } : {}),
    });
  }
  for (const entry of anonymous.values()) {
    const { comment } = entry;
    result.push({
      count: entry.count,
      nick: comment.nick,
      link: comment.link || "",
      avatar:
        comment.avatar ||
        `https://www.gravatar.com/avatar/${createHash("md5")
          .update(comment.mail || comment.nick)
          .digest("hex")}?d=mp&s=80`,
      level: commentLevel(entry.count),
    });
  }

  return result
    .sort((a, b) => b.count - a.count || a.nick.localeCompare(b.nick))
    .slice(0, Math.min(100, Math.max(1, pageSize || 50)));
}
