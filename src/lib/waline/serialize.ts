import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import type { Comment } from "@prisma/client";
import type {
  WalineBaseComment,
  WalineChildComment,
  WalineRootComment,
} from "@/lib/waline/types";

export function md5(value: string): string {
  return createHash("md5").update(value.trim().toLowerCase()).digest("hex");
}

export function defaultAvatar(nick: string, mail?: string | null): string {
  const hash = md5(mail || `${nick}:${Date.now()}`);
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=80`;
}

function parseBrowser(ua?: string | null): { browser?: string; os?: string } {
  if (!ua) return {};
  const parsed = new UAParser(ua).getResult();
  const browser = [parsed.browser.name, parsed.browser.version]
    .filter(Boolean)
    .join(" ");
  const os = [parsed.os.name, parsed.os.version].filter(Boolean).join(" ");
  return { browser, os };
}

export function serializeComment(
  comment: Comment,
  opts: { isOwner?: boolean; withMail?: boolean } = {},
): WalineBaseComment {
  const { browser, os } = parseBrowser(comment.ua);
  const isOwner = Boolean(opts.isOwner);
  return {
    objectId: comment.objectId,
    time: comment.createdAt.getTime(),
    comment: comment.rendered,
    orig: isOwner ? comment.comment : "",
    like: comment.like,
    nick: comment.nick,
    link: comment.link || "",
    avatar: comment.avatar || defaultAvatar(comment.nick, comment.mail),
    status: isOwner ? comment.status : undefined,
    addr: isOwner ? comment.addr || "" : undefined,
    browser: isOwner ? browser : undefined,
    os: isOwner ? os : undefined,
  };
}

export function serializeChild(
  comment: Comment,
  parent: Comment | null,
  opts: { isOwner?: boolean },
): WalineChildComment {
  const base = serializeComment(comment, opts);
  return {
    ...base,
    pid: comment.pid ?? 0,
    rid: comment.rid ?? comment.pid ?? comment.objectId,
    at: comment.at || undefined,
    reply_user: parent
      ? {
          nick: parent.nick,
          link: parent.link || "",
          avatar: parent.avatar || defaultAvatar(parent.nick, parent.mail),
        }
      : undefined,
  };
}

export function serializeRoot(
  comment: Comment,
  children: Comment[],
  parentById: Map<number, Comment>,
  opts: { isOwner?: boolean },
): WalineRootComment {
  return {
    ...serializeComment(comment, opts),
    sticky: comment.sticky,
    children: children
      .map((child) => serializeChild(child, parentById.get(child.pid ?? 0) ?? null, opts))
      .sort((a, b) => a.time - b.time),
  };
}
