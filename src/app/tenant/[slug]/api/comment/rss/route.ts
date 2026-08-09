import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { corsHeaders } from "@/lib/http";
import { identityFromUser } from "@/lib/waline/identity";
import { renderCommentMarkdown } from "@/lib/waline/markdown";
import { prisma } from "@/lib/prisma";
import { tenantContext } from "@/lib/tenant-api";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function cdata(value: string): string {
  const cleaned = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  return `<![CDATA[${cleaned.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function absoluteLink(siteUrl: string, path: string, objectId: number): string {
  const base = /^https?:\/\//i.test(path) ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
  return `${base}#${objectId}`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const instance = ctx.instance!;
  const search = request.nextUrl.searchParams;
  const path = search.get("path") || "";
  const email = search.get("email") || "";
  const userIdParam = search.get("user_id") || "";
  const rawCount = Number(search.get("count"));
  const limit = Number.isFinite(rawCount)
    ? Math.min(50, Math.max(1, Math.floor(rawCount)))
    : 20;

  const approvedWhere = (): Prisma.CommentWhereInput => ({
    status: { notIn: ["waiting", "spam"] },
  });
  let where: Prisma.CommentWhereInput = {
    ...approvedWhere(),
    ...(path ? { url: path } : {}),
  };

  if (!path && (email || userIdParam)) {
    const parentWhere: Prisma.CommentWhereInput = approvedWhere();
    const conditions: Prisma.CommentWhereInput[] = [];
    if (email) conditions.push({ mail: email });
    if (userIdParam) {
      const userObjectId = Number(userIdParam);
      if (Number.isInteger(userObjectId)) {
        const user = await prisma.user.findUnique({ where: { objectId: userObjectId } });
        if (user) conditions.push({ userId: user.id });
      }
    }
    parentWhere.OR = conditions;
    const parents = await prisma.comment.findMany({
      where: parentWhere,
      select: { objectId: true },
    });
    const parentIds = parents.map((parent) => parent.objectId);
    if (parentIds.length === 0) {
      return rssResponse(
        buildXml(instance.name, new URL(request.url).origin, "Reply Comments", "Recent reply comments.", []),
        request,
      );
    }
    where = { ...approvedWhere(), pid: { in: parentIds } };
  }

  const comments = await prisma.comment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const userIds = [
    ...new Set(comments.map((comment) => comment.userId).filter(Boolean)),
  ] as string[];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } } })
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const siteUrl = new URL(request.url).origin;
  const items = comments.map((comment) => {
    const user = comment.userId ? userById.get(comment.userId) : undefined;
    const identity = user ? identityFromUser(user, instance.userId) : undefined;
    const nick = identity?.nick || comment.nick || "Anonymous";
    return {
      title: `${nick} commented on ${comment.url}`,
      link: absoluteLink(siteUrl, comment.url, comment.objectId),
      guid: comment.objectId,
      pubDate: comment.createdAt.toUTCString(),
      description: renderCommentMarkdown(comment.comment),
    };
  });

  const title = path
    ? `${instance.name} Comments for ${path}`
    : email || userIdParam
      ? `${instance.name} Reply Comments`
      : `${instance.name} Recent Comments`;
  const description = path
    ? "Recent comments for this article."
    : email || userIdParam
      ? "Recent reply comments."
      : "Recent comments.";

  return rssResponse(buildXml(instance.name, siteUrl, title, description, items), request);
}

function buildXml(
  siteName: string,
  siteUrl: string,
  title: string,
  description: string,
  items: { title: string; link: string; guid: number; pubDate: string; description: string }[],
): string {
  const channel = [
    `<title>${xmlEscape(title)}</title>`,
    `<link>${xmlEscape(siteUrl)}</link>`,
    `<description>${xmlEscape(description)}</description>`,
    `<language>zh-CN</language>`,
    `<generator>${xmlEscape(siteName)}</generator>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
  ].join("");
  const itemXml = items
    .map(
      (item) =>
        `<item><title>${xmlEscape(item.title)}</title><link>${xmlEscape(item.link)}</link>` +
        `<guid isPermaLink="false">${item.guid}</guid><pubDate>${item.pubDate}</pubDate>` +
        `<description>${cdata(item.description)}</description></item>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>${channel}${itemXml}</channel></rss>`;
}

function rssResponse(xml: string, request: NextRequest): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      ...corsHeaders(request),
      "content-type": "application/rss+xml; charset=utf-8",
    },
  });
}
