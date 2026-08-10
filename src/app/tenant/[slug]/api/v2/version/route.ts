import type { NextRequest } from "next/server";
import { tenantContext } from "@/lib/tenant-api";
import { corsHeaders, jsonResponse } from "@/lib/http";
import { enforceTenantCors, tenantOptionsResponse } from "@/lib/cors";
import { resolveInstance } from "@/lib/instances";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  return jsonResponse({ data: { version: "2.4.0", name: "walinex" } }, 200, request);
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
