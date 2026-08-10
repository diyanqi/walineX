import type { Comment, CommentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderCommentMarkdown } from "@/lib/waline/markdown";
import { parseUserAgent } from "@/lib/waline/ua";

interface RawComment {
  objectId?: unknown;
  id?: unknown;
  importId?: unknown;
  url?: unknown;
  path?: unknown;
  page_key?: unknown;
  nick?: unknown;
  mail?: unknown;
  email?: unknown;
  link?: unknown;
  avatar?: unknown;
  comment?: unknown;
  content?: unknown;
  rendered?: unknown;
  html?: unknown;
  status?: unknown;
  pid?: unknown;
  rid?: unknown;
  at?: unknown;
  like?: unknown;
  like_count?: unknown;
  sticky?: unknown;
  is_pinned?: unknown;
  ua?: unknown;
  ip?: unknown;
  addr?: unknown;
  browser?: unknown;
  os?: unknown;
  spam?: unknown;
  deleted?: unknown;
  is_deleted?: unknown;
  createdAt?: unknown;
  insertedAt?: unknown;
  time?: unknown;
  spamScore?: unknown;
  moderationReason?: unknown;
  moderatedBy?: unknown;
}

interface RawCounter {
  url?: unknown;
  path?: unknown;
  page_key?: unknown;
  time?: unknown;
  reaction0?: unknown;
  reaction1?: unknown;
  reaction2?: unknown;
  reaction3?: unknown;
  reaction4?: unknown;
  reaction5?: unknown;
  reaction6?: unknown;
  reaction7?: unknown;
  reaction8?: unknown;
}

interface NormalizedComment {
  importId: string | null;
  url: string;
  nick: string;
  mail: string | null;
  link: string | null;
  avatar: string | null;
  comment: string;
  rendered: string;
  status: CommentStatus;
  pid: number | null;
  rid: number | null;
  at: string | null;
  like: number;
  sticky: boolean;
  ua: string | null;
  ip: string | null;
  addr: string | null;
  browser: string | null;
  os: string | null;
  createdAt: Date;
  spamScore: number | null;
  moderationReason: string | null;
  moderatedBy: string | null;
  deleted: boolean;
}

function toNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toStatus(value: unknown): CommentStatus {
  const status = String(value || "").toLowerCase();
  if (status === "spam") return "spam";
  if (status === "waiting" || status === "pending" || status === "review") return "waiting";
  return "approved";
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return value === "true" || value === "1";
}

function extractComments(payload: unknown): RawComment[] {
  if (Array.isArray(payload)) return payload as RawComment[];
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  if (Array.isArray(object.data)) return object.data as RawComment[];
  if (Array.isArray(object.comments)) return object.comments as RawComment[];
  if (object.data && typeof object.data === "object") {
    const data = object.data as Record<string, unknown>;
    if (Array.isArray(data.Comment)) return data.Comment as RawComment[];
    if (Array.isArray(data.comments)) return data.comments as RawComment[];
  }
  return [];
}

function extractCounters(payload: unknown): RawCounter[] {
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  if (Array.isArray(object.counters)) return object.counters as RawCounter[];
  if (Array.isArray(object.Counter)) return object.Counter as RawCounter[];
  if (object.data && typeof object.data === "object") {
    const data = object.data as Record<string, unknown>;
    if (Array.isArray(data.Counter)) return data.Counter as RawCounter[];
    if (Array.isArray(data.counters)) return data.counters as RawCounter[];
  }
  return [];
}

function normalizeComment(raw: RawComment): NormalizedComment | null {
  const comment = String(raw.comment ?? raw.content ?? "").trim();
  const nick = String(raw.nick ?? "").trim();
  if (!comment || !nick) return null;
  const sourceId = raw.objectId ?? raw.id ?? raw.importId;
  const importId =
    sourceId == null || String(sourceId).trim() === "" ? null : String(sourceId);
  const createdAt = toDate(raw.createdAt ?? raw.insertedAt ?? raw.time) ?? new Date();
  const rendered = String(raw.rendered ?? raw.html ?? "").trim();
  const deleted = toBool(raw.deleted ?? raw.is_deleted);
  const mailValue = raw.mail ?? raw.email;
  const ua = raw.ua ? String(raw.ua).slice(0, 500) : null;
  const { browser: uaBrowser, os: uaOs } = parseUserAgent(ua);
  return {
    importId,
    url: String(raw.url ?? raw.path ?? raw.page_key ?? "/").slice(0, 1000) || "/",
    nick: nick.slice(0, 50),
    mail: mailValue ? String(mailValue).slice(0, 200) : null,
    link: raw.link ? String(raw.link).slice(0, 500) : null,
    avatar: raw.avatar ? String(raw.avatar).slice(0, 1000) : null,
    comment,
    rendered: rendered || renderCommentMarkdown(comment),
    status: toStatus(raw.status),
    pid: toNumber(raw.pid),
    rid: toNumber(raw.rid),
    at: raw.at ? String(raw.at).slice(0, 100) : null,
    like: Math.max(0, toNumber(raw.like ?? raw.like_count) ?? 0),
    sticky: toBool(raw.sticky ?? raw.is_pinned),
    ua,
    ip: raw.ip ? String(raw.ip).slice(0, 100) : null,
    addr: raw.addr ? String(raw.addr).slice(0, 200) : null,
    browser: raw.browser ? String(raw.browser).slice(0, 200) : uaBrowser || null,
    os: raw.os ? String(raw.os).slice(0, 200) : uaOs || null,
    spamScore: toNumber(raw.spamScore),
    moderationReason: raw.moderationReason ? String(raw.moderationReason).slice(0, 500) : null,
    moderatedBy: raw.moderatedBy ? String(raw.moderatedBy).slice(0, 100) : null,
    createdAt,
    deleted,
  };
}

export async function exportWalineData(instanceId: string) {
  const [comments, users, counters] = await Promise.all([
    prisma.comment.findMany({
      where: { instanceId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { instances: { some: { id: instanceId } } },
          { comments: { some: { instanceId } } },
        ],
      },
      select: { objectId: true, email: true, name: true, avatar: true, url: true },
    }),
    prisma.articleCounter.findMany({
      where: { instanceId },
      orderBy: { url: "asc", type: "asc" },
    }),
  ]);
  return {
    version: 1,
    type: "waline",
    exportedAt: new Date().toISOString(),
    comments: comments.map((comment) => ({
      objectId: comment.objectId,
      importId: comment.importId,
      url: comment.url,
      nick: comment.nick,
      mail: comment.mail,
      link: comment.link,
      avatar: comment.avatar,
      comment: comment.comment,
      rendered: comment.rendered,
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
      spamScore: comment.spamScore,
      moderationReason: comment.moderationReason,
      moderatedBy: comment.moderatedBy,
      createdAt: comment.createdAt.toISOString(),
      insertedAt: comment.createdAt.getTime(),
      deleted: Boolean(comment.deletedAt),
    })),
    users: users.map((user) => ({
      objectId: user.objectId,
      email: user.email,
      nick: user.name,
      avatar: user.avatar,
      url: user.url,
    })),
    counters: counters.map((counter) => ({
      url: counter.url,
      type: counter.type,
      value: counter.value,
    })),
  };
}

async function importWalineCounters(
  instanceId: string,
  payload: unknown,
): Promise<number> {
  const records = extractCounters(payload);
  const entries: Array<{
    instanceId: string;
    url: string;
    type: string;
    value: number;
  }> = [];
  for (const raw of records) {
    const url = String(raw.url ?? raw.path ?? raw.page_key ?? "/")
      .slice(0, 1000) || "/";
    const values: Array<[string, unknown]> = [
      ["time", raw.time],
      ["reaction0", raw.reaction0],
      ["reaction1", raw.reaction1],
      ["reaction2", raw.reaction2],
      ["reaction3", raw.reaction3],
      ["reaction4", raw.reaction4],
      ["reaction5", raw.reaction5],
      ["reaction6", raw.reaction6],
      ["reaction7", raw.reaction7],
      ["reaction8", raw.reaction8],
    ];
    for (const [type, value] of values) {
      const number = toNumber(value);
      if (number == null || number <= 0) continue;
      entries.push({ instanceId, url, type, value: number });
    }
  }
  if (entries.length === 0) return 0;
  let count = 0;
  for (let index = 0; index < entries.length; index += 1000) {
    const result = await prisma.articleCounter.createMany({
      data: entries.slice(index, index + 1000),
      skipDuplicates: true,
    });
    count += result.count;
  }
  return count;
}

export async function importWalineComments(
  instanceId: string,
  payload: unknown,
): Promise<{ imported: number; skipped: number; failed: number; counters: number }> {
  const records = extractComments(payload)
    .map(normalizeComment)
    .filter((item): item is NormalizedComment => item !== null);
  const idMap = new Map<string, number>();
  const pendingRefs: Array<{
    comment: Comment;
    pid: number | null;
    rid: number | null;
  }> = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records) {
    if (record.deleted) {
      skipped += 1;
      continue;
    }
    if (record.importId) {
      const existing = await prisma.comment.findUnique({
        where: {
          instanceId_importId: { instanceId, importId: record.importId },
        },
      });
      if (existing) {
        skipped += 1;
        idMap.set(record.importId, existing.objectId);
        continue;
      }
    }
    try {
      const comment = await prisma.comment.create({
        data: {
          instanceId,
          importId: record.importId,
          url: record.url,
          nick: record.nick,
          mail: record.mail,
          link: record.link,
          avatar: record.avatar,
          comment: record.comment,
          rendered: record.rendered,
          status: record.status,
          like: record.like,
          sticky: record.sticky,
          ua: record.ua,
          ip: record.ip,
          addr: record.addr,
          browser: record.browser,
          os: record.os,
          at: record.at,
          spamScore: record.spamScore,
          moderationReason: record.moderationReason,
          moderatedBy: record.moderatedBy,
          createdAt: record.createdAt,
        },
      });
      imported += 1;
      if (record.importId) idMap.set(record.importId, comment.objectId);
      pendingRefs.push({
        comment,
        pid: record.pid && record.pid > 0 ? record.pid : null,
        rid: record.rid && record.rid > 0 ? record.rid : null,
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        skipped += 1;
      } else {
        failed += 1;
      }
    }
  }

  for (const ref of pendingRefs) {
    const pid = ref.pid ? idMap.get(String(ref.pid)) : null;
    const rid = ref.rid ? idMap.get(String(ref.rid)) : null;
    if (!pid && !rid) continue;
    await prisma.comment.update({
      where: { objectId: ref.comment.objectId },
      data: {
        pid,
        rid: rid || pid,
      },
    });
  }
  let counters = 0;
  try {
    counters = await importWalineCounters(instanceId, payload);
  } catch (error) {
    console.error("Waline counter import failed", error);
  }
  return { imported, skipped, failed, counters };
}
