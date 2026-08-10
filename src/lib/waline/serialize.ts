import { createHash } from "node:crypto";
import type { Comment } from "@prisma/client";
import { parseUserAgent } from "@/lib/waline/ua";
import type {
  WalineBaseComment,
  WalineChildComment,
  WalineIdentity,
  WalineRootComment,
} from "@/lib/waline/types";

export function md5(value: string): string {
  return createHash("md5").update(value.trim().toLowerCase()).digest("hex");
}

export function defaultAvatar(nick: string, mail?: string | null): string {
  const hash = md5(mail || `${nick}:${Date.now()}`);
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=80`;
}

export interface WalineSerializeOptions {
  isOwner?: boolean;
  login?: boolean;
  identityByUserId?: Map<string, WalineIdentity>;
  levelByObjectId?: Map<number, number>;
}

function applyIdentity(
  base: WalineBaseComment,
  identity?: WalineIdentity,
  level?: number,
): WalineBaseComment {
  const enriched: WalineBaseComment = {
    ...base,
    ...(level === undefined ? {} : { level }),
  };
  if (!identity) return enriched;
  return {
    ...enriched,
    user_id: identity.objectId,
    nick: identity.nick,
    link: identity.link || base.link,
    avatar: identity.avatar || base.avatar,
    ...(identity.type ? { type: identity.type } : {}),
    ...(identity.label ? { label: identity.label } : {}),
  };
}

export function serializeComment(
  comment: Comment,
  opts: WalineSerializeOptions = {},
): WalineBaseComment {
  const { browser, os } = parseUserAgent(comment.ua);
  const isOwner = Boolean(opts.isOwner);
  const showRaw = Boolean(opts.login || opts.isOwner);
  const identity = comment.userId
    ? opts.identityByUserId?.get(comment.userId)
    : undefined;
  const level = opts.levelByObjectId?.get(comment.objectId);
  const base: WalineBaseComment = {
    objectId: comment.objectId,
    time: comment.createdAt.getTime(),
    comment: comment.rendered,
    orig: showRaw ? comment.comment : "",
    like: comment.like,
    sticky: comment.sticky,
    nick: comment.nick,
    link: comment.link || "",
    avatar: comment.avatar || defaultAvatar(comment.nick, comment.mail),
    status: isOwner ? comment.status : undefined,
    addr: isOwner ? comment.addr || "" : undefined,
    browser: isOwner ? browser : undefined,
    os: isOwner ? os : undefined,
  };
  return applyIdentity(base, identity, level);
}

export function serializeChild(
  comment: Comment,
  parent: Comment | null,
  opts: WalineSerializeOptions = {},
): WalineChildComment {
  const base = serializeComment(comment, opts);
  const parentIdentity = parent?.userId
    ? opts.identityByUserId?.get(parent.userId)
    : undefined;
  return {
    ...base,
    pid: comment.pid ?? 0,
    rid: comment.rid ?? comment.pid ?? comment.objectId,
    at: comment.at || undefined,
    reply_user: parent
      ? {
          nick: parentIdentity?.nick ?? parent.nick,
          link: parentIdentity?.link || parent.link || "",
          avatar:
            parentIdentity?.avatar ||
            parent.avatar ||
            defaultAvatar(parent.nick, parent.mail),
        }
      : undefined,
  };
}

export function serializeRoot(
  comment: Comment,
  children: Comment[],
  parentById: Map<number, Comment>,
  opts: WalineSerializeOptions = {},
): WalineRootComment {
  return {
    ...serializeComment(comment, opts),
    sticky: comment.sticky,
    children: children
      .map((child) => serializeChild(child, parentById.get(child.pid ?? 0) ?? null, opts))
      .sort((a, b) => a.time - b.time),
  };
}
