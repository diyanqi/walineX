import type { NextRequest } from "next/server";
import { tenantContext } from "@/lib/tenant-api";
import { jsonResponse } from "@/lib/http";
import { userList } from "@/lib/waline/service";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize")) || 50;
  const data = await userList(ctx.instance!.id, pageSize);
  return jsonResponse({ errno: 0, data }, 200, request);
}
