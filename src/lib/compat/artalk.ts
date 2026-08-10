import type { Comment, Instance, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createComment } from "@/lib/waline/service";
import { defaultAvatar } from "@/lib/waline/serialize";

export function artalkComment(comment: Comment) {
  return {
    id: comment.objectId,
    content: comment.rendered,
    orig: comment.comment,
    page_key: comment.url,
    nick: comment.nick,
    email: comment.mail,
    link: comment.link,
    avatar: comment.avatar || defaultAvatar(comment.nick, comment.mail),
    date: comment.createdAt.toISOString(),
    rid: comment.pid ?? 0,
    ua: comment.ua,
    ip: comment.ip,
    is_pinned: comment.sticky,
    like_count: comment.like,
    status: comment.status,
  };
}

export async function artalkListComments(options: {
  instance: Instance;
  isOwner: boolean;
  pageKey: string;
  limit: number;
  offset: number;
}) {
  const { instance, isOwner, pageKey, limit, offset } = options;
  const where = {
    instanceId: instance.id,
    url: pageKey || "/",
    deletedAt: null,
    ...(isOwner ? {} : { status: "approved" as const }),
  };
  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
    }),
  ]);
  return {
    data: {
      comments: comments.map(artalkComment),
      total,
      offset,
      limit,
    },
  };
}

export async function artalkCreateComment(options: {
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
      mail: body.email ? String(body.email) : undefined,
      link: body.link ? String(body.link) : undefined,
      comment: String(body.content || ""),
      ua: String(body.ua || ""),
      url: String(body.page_key || body.url || "/"),
      pid: body.rid ? Number(body.rid) : undefined,
      at: body.page_title ? String(body.page_title) : undefined,
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
  return { data: artalkComment(comment) };
}
