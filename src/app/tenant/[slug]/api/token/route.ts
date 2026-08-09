import { NextRequest } from "next/server";
import { tenantContext } from "@/lib/tenant-api";
import { getSessionUser, issueWalineToken, verifyWalineToken } from "@/lib/auth";
import { corsHeaders, errorResponse, jsonResponse } from "@/lib/http";
import { enforceTenantCors, tenantOptionsResponse } from "@/lib/cors";
import { resolveInstance } from "@/lib/instances";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;
  const blocked = enforceTenantCors(ctx.instance!, request);
  if (blocked) return blocked;
  const authorization = request.headers.get("authorization");
  let token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const payload = token ? await verifyWalineToken(token, slug) : null;
  let user = ctx.user;
  let userId = payload?.userId ?? null;
  if (!userId) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return errorResponse(401, "登录状态已失效", request);
    userId = sessionUser.id;
    user = sessionUser;
    token = await issueWalineToken(userId, slug);
  }
  if (!user) return errorResponse(401, "登录状态已失效", request);
  return jsonResponse(
    {
      errno: 0,
      data: {
        token,
        display_name: user.name || user.email || "用户",
        email: user.email || "",
        url: user.url || "",
        avatar: user.avatar || "",
        objectId: user.objectId,
        type: ctx.instance?.userId === user.id ? "administrator" : "guest",
      },
    },
    200,
    request,
  );
}

export async function POST() {
  return errorResponse(400, "本服务使用 GitHub / Google 登录，请访问 /ui/login", new NextRequest("http://localhost"));
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
