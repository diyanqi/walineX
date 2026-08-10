import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { tenantContext } from "@/lib/tenant-api";
import { corsHeaders, jsonResponse } from "@/lib/http";
import { enforceTenantCors, tenantOptionsResponse } from "@/lib/cors";
import { resolveInstance } from "@/lib/instances";
import { valineComment, valineUpdateComment } from "@/lib/compat/valine";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; objectId: string }> },
) {
  const { slug, objectId } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const comment = await prisma.comment.findFirst({
    where: { instanceId: ctx.instance!.id, objectId: Number(objectId), deletedAt: null },
  });
  if (!comment) return jsonResponse({ error: "评论不存在" }, 404, request);
  return jsonResponse(valineComment(comment), 200, request);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string; objectId: string }> },
) {
  const { slug, objectId } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await valineUpdateComment(
    ctx.instance!,
    Number(objectId),
    body,
    ctx.isOwner,
  );
  if ("error" in result) {
    return jsonResponse({ error: result.error }, result.status, request);
  }
  return jsonResponse(result.data, 200, request);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string; objectId: string }> },
) {
  const { slug, objectId } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  if (!ctx.isOwner) return jsonResponse({ error: "需要管理员权限" }, 403, request);
  await prisma.comment.update({
    where: { objectId: Number(objectId) },
    data: { deletedAt: new Date() },
  });
  return jsonResponse({ ok: true }, 200, request);
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
