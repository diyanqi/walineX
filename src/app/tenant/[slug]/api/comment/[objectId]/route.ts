import type { NextRequest } from "next/server";
import { tenantContext } from "@/lib/tenant-api";
import { corsHeaders, errorResponse, jsonResponse } from "@/lib/http";
import { enforceTenantCors, tenantOptionsResponse } from "@/lib/cors";
import { resolveInstance } from "@/lib/instances";
import { deleteComment, updateComment } from "@/lib/waline/service";
import { clientIp } from "@/lib/ratelimit";

export async function PUT(request: NextRequest, context: { params: Promise<{ slug: string; objectId: string }> }) {
  const { slug, objectId } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await updateComment(ctx.instance!, Number(objectId), body, {
    ip: clientIp(request),
    isOwner: ctx.isOwner,
  }, ctx.user);
  if ("error" in result) {
    const error = result.error;
    if (error) return errorResponse(error.errno, error.errmsg, request);
  }
  return jsonResponse({ errno: 0, data: result.data }, 200, request);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ slug: string; objectId: string }> }) {
  const { slug, objectId } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const result = await deleteComment(ctx.instance!, Number(objectId), ctx.user);
  if ("error" in result) {
    const error = result.error;
    if (error) return errorResponse(error.errno, error.errmsg, request);
  }
  return jsonResponse({ errno: 0, data: result.data }, 200, request);
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
