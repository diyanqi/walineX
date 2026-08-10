import type { Comment, Instance, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createComment } from "@/lib/waline/service";
import { renderCommentMarkdown } from "@/lib/waline/markdown";
import { defaultAvatar } from "@/lib/waline/serialize";

export function valineComment(comment: Comment) {
  return {
    objectId: String(comment.objectId),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    content: comment.comment,
    rendered: comment.rendered,
    nick: comment.nick,
    mail: comment.mail,
    link: comment.link,
    avatar: comment.avatar || defaultAvatar(comment.nick, comment.mail),
    url: comment.url,
    pid: comment.pid ?? 0,
    rid: comment.rid ?? 0,
    at: comment.at,
    ua: comment.ua,
    ip: comment.ip,
    addr: comment.addr,
    status: comment.status,
    like: comment.like,
    sticky: comment.sticky,
  };
}

function parseWhere(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function valineListComments(options: {
  instance: Instance;
  isOwner: boolean;
  where: string | null;
  order: string;
  limit: number;
  skip: number;
}) {
  const { instance, isOwner, where, order, limit, skip } = options;
  const parsed = parseWhere(where);
  const url = typeof parsed.url === "string" ? parsed.url : undefined;
  const status = isOwner
    ? undefined
    : {
        status: "approved" as const,
      };
  const baseWhere = {
    instanceId: instance.id,
    deletedAt: null,
    ...(url ? { url } : {}),
    ...(status ? status : {}),
  };
  const [count, comments] = await Promise.all([
    prisma.comment.count({ where: baseWhere }),
    prisma.comment.findMany({
      where: baseWhere,
      orderBy: order === "asc" ? { createdAt: "asc" } : { createdAt: "desc" },
      skip,
      take: Math.min(1000, Math.max(1, limit)),
    }),
  ]);
  return { results: comments.map(valineComment), count };
}

export async function valineCreateComment(options: {
  instance: Instance;
  user: User | null;
  isOwner: boolean;
  body: Record<string, unknown>;
  ip: string;
}) {
  const { instance, user, isOwner, body, ip } = options;
  if (instance.requireCap) {
    return { error: "请先完成人机验证", status: 400 };
  }
  const result = await createComment(
    instance,
    {
      nick: String(body.nick || ""),
      mail: body.mail ? String(body.mail) : undefined,
      link: body.link ? String(body.link) : undefined,
      comment: String(body.content || ""),
      ua: String(body.ua || ""),
      url: String(body.url || "/"),
      pid: body.pid ? Number(body.pid) : undefined,
      rid: body.rid ? Number(body.rid) : undefined,
      authorUserId: user?.id,
    },
    { ip, isOwner },
  );
  if ("error" in result) {
    return {
      error: result.error?.errmsg || "评论失败",
      status: result.error?.errno || 400,
    };
  }
  const comment = await prisma.comment.findUniqueOrThrow({
    where: { objectId: result.data.objectId },
  });
  return { data: valineComment(comment) };
}

export async function valineUpdateComment(
  instance: Instance,
  objectId: number,
  body: Record<string, unknown>,
  isOwner: boolean,
) {
  const existing = await prisma.comment.findFirst({
    where: { instanceId: instance.id, objectId, deletedAt: null },
  });
  if (!existing) return { error: "评论不存在", status: 404 };
  if (!isOwner) return { error: "需要管理员权限", status: 403 };
  const data: Record<string, unknown> = {};
  if (typeof body.content === "string" && body.content.trim()) {
    data.comment = body.content.trim();
    data.rendered = renderCommentMarkdown(data.comment as string);
  }
  if (typeof body.nick === "string" && body.nick.trim()) data.nick = body.nick.trim();
  if (typeof body.mail === "string") data.mail = body.mail.trim() || null;
  if (typeof body.link === "string") data.link = body.link.trim() || null;
  if (body.like && typeof body.like === "object") {
    const likeOp = body.like as { __op?: string; amount?: number };
    if (likeOp.__op === "Increment") {
      data.like = Math.max(
        0,
        existing.like + Math.max(1, Number(likeOp.amount) || 1),
      );
    }
  } else if (typeof body.like === "number") {
    data.like = Math.max(0, body.like);
  }
  if (Object.keys(data).length === 0) return { error: "没有可更新的字段", status: 400 };
  const updated = await prisma.comment.update({
    where: { objectId },
    data: data as never,
  });
  return { data: valineComment(updated) };
}
