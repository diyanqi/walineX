import type { NextRequest } from "next/server";
import { tenantContext } from "@/lib/tenant-api";
import { corsHeaders, jsonResponse } from "@/lib/http";
import { enforceTenantCors, tenantOptionsResponse } from "@/lib/cors";
import { resolveInstance } from "@/lib/instances";
import { artalkCreateComment, artalkListComments } from "@/lib/compat/artalk";
import { clientIp } from "@/lib/ratelimit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const search = request.nextUrl.searchParams;
  const data = await artalkListComments({
    instance: ctx.instance!,
    isOwner: ctx.isOwner,
    pageKey: search.get("page_key") || search.get("pageKey") || "/",
    limit: Math.min(100, Math.max(1, Number(search.get("limit")) || 20)),
    offset: Math.max(0, Number(search.get("offset")) || 0),
  });
  return jsonResponse(data, 200, request);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await artalkCreateComment({
    instance: ctx.instance!,
    user: ctx.user,
    isOwner: ctx.isOwner,
    body,
    ip: clientIp(request),
  });
  if ("error" in result) {
    return jsonResponse({ data: null, error: result.error }, result.status, request);
  }
  return jsonResponse({ data: result.data }, 201, request);
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
