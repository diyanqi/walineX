import type { NextRequest } from "next/server";
import { tenantContext } from "@/lib/tenant-api";
import { corsHeaders, errorResponse, jsonResponse } from "@/lib/http";
import {
  adminCommentList,
  countComments,
  createComment,
  listComments,
  recentComments,
} from "@/lib/waline/service";
import { clientIp } from "@/lib/ratelimit";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const instance = ctx.instance!;
  const search = request.nextUrl.searchParams;
  const type = search.get("type");

  if (type === "count") {
    const paths = (search.get("url") || search.get("path") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const data = await countComments(instance.id, paths, {
      isOwner: ctx.isOwner,
      userId: ctx.user?.id,
    });
    return jsonResponse({ errno: 0, data }, 200, request);
  }

  if (type === "recent") {
    const data = await recentComments(
      instance,
      Number(search.get("count")) || 10,
      ctx.isOwner,
      ctx.user?.id,
    );
    return jsonResponse(data, 200, request);
  }

  if (type === "list") {
    if (!ctx.isOwner) return errorResponse(403, "只有实例管理员可以查看全部评论", request);
    const data = await adminCommentList(instance, {
      page: Number(search.get("page")) || 1,
      pageSize: Number(search.get("pageSize")) || 20,
      status: search.get("status") || undefined,
      keyword: search.get("keyword") || undefined,
    });
    return jsonResponse({ errno: 0, ...data }, 200, request);
  }

  const path = search.get("path") || "/";
  const page = Math.max(1, Number(search.get("page")) || 1);
  const pageSize = Math.max(1, Number(search.get("pageSize")) || 10);
  const data = await listComments({
    instance,
    path,
    page,
    pageSize,
    isOwner: ctx.isOwner,
    userId: ctx.user?.id,
    sortBy: search.get("sortBy") || undefined,
  });
  return jsonResponse(
    {
      errno: 0,
      data: {
        data: data.data,
        page: data.page,
        totalPages: data.totalPages,
        pageSize: data.pageSize,
        count: data.count,
      },
    },
    200,
    request,
  );
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const instance = ctx.instance!;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (instance.requireCap && !body.capToken) {
    return errorResponse(400, "请先完成人机验证", request);
  }
  const result = await createComment(
    instance,
    {
      nick: String(body.nick || ""),
      mail: body.mail ? String(body.mail) : undefined,
      link: body.link ? String(body.link) : undefined,
      comment: String(body.comment || ""),
      ua: String(body.ua || ""),
      url: String(body.url || "/"),
      pid: body.pid ? Number(body.pid) : undefined,
      rid: body.rid ? Number(body.rid) : undefined,
      at: body.at ? String(body.at) : undefined,
      capToken: body.capToken ? String(body.capToken) : undefined,
      capSolutions: Array.isArray(body.capSolutions) ? (body.capSolutions as number[]) : undefined,
      authorUserId: ctx.user?.id,
    },
    { ip: clientIp(request), isOwner: ctx.isOwner },
  );
  if ("error" in result) {
    const error = result.error;
    if (error) return errorResponse(error.errno, error.errmsg, request);
  }
  return jsonResponse({ errno: 0, data: result.data }, 200, request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
