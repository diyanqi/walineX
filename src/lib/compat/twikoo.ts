import type { Comment, CommentStatus, Instance, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createComment } from "@/lib/waline/service";
import { defaultAvatar } from "@/lib/waline/serialize";
import { renderCommentMarkdown } from "@/lib/waline/markdown";

export function twikooOk(data: unknown) {
  return { code: 0, data, msg: "" };
}

export function twikooError(msg: string) {
  return { code: 1, data: null, msg };
}

function visibleStatus(isOwner: boolean): CommentStatus[] | undefined {
  return isOwner ? undefined : ["approved" as const];
}

export function twikooComment(comment: Comment) {
  return {
    id: comment.objectId,
    url: comment.url,
    nick: comment.nick,
    mail: comment.mail,
    link: comment.link,
    avatar: comment.avatar || defaultAvatar(comment.nick, comment.mail),
    comment: comment.rendered,
    orig: comment.comment,
    status: comment.status,
    pid: comment.pid ?? 0,
    rid: comment.rid ?? 0,
    at: comment.at,
    like: comment.like,
    sticky: comment.sticky,
    ua: comment.ua,
    ip: comment.ip,
    addr: comment.addr,
    browser: comment.browser,
    os: comment.os,
    created: comment.createdAt.getTime(),
  };
}

export async function handleTwikoo(options: {
  action: string;
  instance: Instance;
  user: User | null;
  isOwner: boolean;
  search: URLSearchParams;
  body: Record<string, unknown>;
  ip: string;
}) {
  const { action, instance, user, isOwner, search, body, ip } = options;
  const path = String(body.path || search.get("path") || "/");
  const page = Math.max(1, Number(body.page ?? search.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(body.pageSize ?? search.get("pageSize")) || 10),
  );
  const statusIn = visibleStatus(isOwner);

  if (action === "get-comments") {
    const where = {
      instanceId: instance.id,
      url: path,
      deletedAt: null,
      ...(statusIn ? { status: { in: statusIn } } : {}),
    };
    const [count, comments] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      status: 200,
      payload: twikooOk({
        comments: comments.map(twikooComment),
        count,
        total: count,
        page,
        pageSize,
      }),
    };
  }

  if (action === "get-latest-comments") {
    const where = {
      instanceId: instance.id,
      deletedAt: null,
      ...(statusIn ? { status: { in: statusIn } } : {}),
    };
    const [count, comments] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      status: 200,
      payload: twikooOk({
        comments: comments.map(twikooComment),
        count,
        total: count,
        page,
        pageSize,
      }),
    };
  }

  if (action === "get-count") {
    const paths = String(body.path || search.get("url") || search.get("path") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (paths.length === 0) {
      return {
        status: 200,
        payload: twikooOk({ counts: {}, count: 0 }),
      };
    }
    const groups = await prisma.comment.groupBy({
      by: ["url"],
      where: {
        instanceId: instance.id,
        deletedAt: null,
        ...(statusIn ? { status: { in: statusIn } } : {}),
        url: { in: paths },
      },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      groups.map((group) => [group.url, (group._count as { _all: number })._all]),
    );
    return {
      status: 200,
      payload: twikooOk({ counts, count: counts[path] || 0 }),
    };
  }

  if (action === "get-config") {
    return {
      status: 200,
      payload: twikooOk({
        imageUploader: false,
        emojiData: [],
        adminEmails: user?.isAdmin ? [user.email].filter(Boolean) : [],
        enableSentry: false,
      }),
    };
  }

  if (action === "get-comment") {
    const objectId = Number(body.id ?? body.objectId);
    const comment = await prisma.comment.findFirst({
      where: { instanceId: instance.id, objectId, deletedAt: null },
    });
    if (!comment) return { status: 404, payload: twikooError("评论不存在") };
    return { status: 200, payload: twikooOk(twikooComment(comment)) };
  }

  if (action === "add-comment") {
    if (instance.requireCap && !body.capToken) {
      return { status: 400, payload: twikooError("请先完成人机验证") };
    }
    const result = await createComment(
      instance,
      {
        nick: String(body.nick || ""),
        mail: body.mail ? String(body.mail) : undefined,
        link: body.link ? String(body.link) : undefined,
        comment: String(body.comment || ""),
        ua: String(body.ua || ""),
        url: path,
        pid: body.pid ? Number(body.pid) : undefined,
        rid: body.rid ? Number(body.rid) : undefined,
        at: body.at ? String(body.at) : undefined,
        capToken: body.capToken ? String(body.capToken) : undefined,
        capSolutions: Array.isArray(body.capSolutions)
          ? (body.capSolutions as number[])
          : undefined,
        authorUserId: user?.id,
      },
      { ip, isOwner },
    );
    if ("error" in result) {
      return {
        status: result.error?.errno || 400,
        payload: twikooError(result.error?.errmsg || "评论失败"),
      };
    }
    const comment = await prisma.comment.findUniqueOrThrow({
      where: { objectId: result.data.objectId },
    });
    return { status: 200, payload: twikooOk(twikooComment(comment)) };
  }

  if (action === "like-comment") {
    const objectId = Number(body.id ?? body.objectId);
    const comment = await prisma.comment.findFirst({
      where: { instanceId: instance.id, objectId, deletedAt: null },
    });
    if (!comment) return { status: 404, payload: twikooError("评论不存在") };
    const like = Math.max(
      0,
      comment.like + (String(body.action || "like") === "cancel" ? -1 : 1),
    );
    const updated = await prisma.comment.update({
      where: { objectId },
      data: { like },
    });
    return { status: 200, payload: twikooOk(twikooComment(updated)) };
  }

  if (action === "update-comment" || action === "delete-comment") {
    if (!isOwner) return { status: 403, payload: twikooError("需要管理员权限") };
    const objectId = Number(body.id ?? body.objectId);
    const existing = await prisma.comment.findFirst({
      where: { instanceId: instance.id, objectId, deletedAt: null },
    });
    if (!existing) return { status: 404, payload: twikooError("评论不存在") };
    if (action === "delete-comment") {
      await prisma.comment.update({
        where: { objectId },
        data: { deletedAt: new Date() },
      });
      return { status: 200, payload: twikooOk({ ok: true }) };
    }
    const content = String(body.comment ?? "").trim();
    const updated = await prisma.comment.update({
      where: { objectId },
      data: {
        comment: content || existing.comment,
        rendered: content ? renderCommentMarkdown(content) : existing.rendered,
        nick: body.nick ? String(body.nick).slice(0, 50) : existing.nick,
        mail: body.mail ? String(body.mail).slice(0, 200) : existing.mail,
        link: body.link ? String(body.link).slice(0, 500) : existing.link,
      },
    });
    return { status: 200, payload: twikooOk(twikooComment(updated)) };
  }

  if (action === "get-user-info") {
    return {
      status: 200,
      payload: twikooOk(
        user
          ? {
              nick: user.name || user.email,
              mail: user.email,
              link: user.url,
              avatar: user.avatar,
            }
          : null,
      ),
    };
  }

  return { status: 400, payload: twikooError(`不支持的 action: ${action}`) };
}
