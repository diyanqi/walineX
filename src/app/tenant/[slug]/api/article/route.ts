import type { NextRequest } from "next/server";
import { tenantContext } from "@/lib/tenant-api";
import { corsHeaders, errorResponse, jsonResponse } from "@/lib/http";
import { enforceTenantCors, tenantOptionsResponse } from "@/lib/cors";
import { resolveInstance } from "@/lib/instances";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const search = request.nextUrl.searchParams;
  const paths = (search.get("path") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const types = (search.get("type") || "time")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (paths.length === 0) {
    return jsonResponse({ errno: 0, data: 0 }, 200, request);
  }
  const counters = await prisma.articleCounter.findMany({
    where: { instanceId: ctx.instance!.id, url: { in: paths }, type: { in: types } },
  });
  const byUrl = new Map<string, Map<string, number>>();
  for (const counter of counters) {
    const map = byUrl.get(counter.url) ?? new Map();
    map.set(counter.type, counter.value);
    byUrl.set(counter.url, map);
  }
  const data = paths.map((path) => {
    const map = byUrl.get(path) ?? new Map();
    return Object.fromEntries(types.map((type) => [type, map.get(type) ?? 0]));
  });
  return jsonResponse({ errno: 0, data }, 200, request);
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const limit = await rateLimit(`article:${ctx.instance!.id}:${clientIp(request)}`, 60, 60);
  if (!limit.allowed) {
    return errorResponse(429, "文章计数器请求太快，请稍后再试。", request);
  }
  const body = (await request.json().catch(() => ({}))) as {
    path?: string;
    type?: string;
    action?: "inc" | "desc";
  };
  const path = String(body.path || "").trim();
  const type = String(body.type || "time").trim();
  if (!path || !type) return errorResponse(400, "path 和 type 不能为空", request);
  const existing = await prisma.articleCounter.findUnique({
    where: { instanceId_url_type: { instanceId: ctx.instance!.id, url: path, type } },
  });
  const next = Math.max(0, (existing?.value ?? 0) + (body.action === "desc" ? -1 : 1));
  const counter = await prisma.articleCounter.upsert({
    where: { instanceId_url_type: { instanceId: ctx.instance!.id, url: path, type } },
    create: { instanceId: ctx.instance!.id, url: path, type, value: next },
    update: { value: next },
  });
  return jsonResponse({ errno: 0, data: [{ [type]: counter.value }] }, 200, request);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const resolved = await resolveInstance(slug);
  if (resolved.error) return new Response(null, { status: 204, headers: corsHeaders(request) });
  return tenantOptionsResponse(resolved.instance, request);
}
