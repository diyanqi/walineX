import type { NextRequest } from "next/server";
import { getSessionUser, issueWalineToken, verifyWalineToken } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { tenantContext } from "@/lib/tenant-api";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const ctx = await tenantContext(request, slug);
  if (ctx.response) return ctx.response;

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  let user = ctx.user;

  if (token) {
    const payload = await verifyWalineToken(token, slug);
    if (!payload) return errorResponse(401, "登录状态已失效", request);
    user = await prisma.user.findUnique({ where: { id: payload.userId } });
  } else {
    user = await getSessionUser();
  }

  if (!user || user.deletedAt) {
    return errorResponse(401, "登录状态已失效", request);
  }

  return jsonResponse(
    {
      errno: 0,
      data: {
        objectId: user.objectId,
        token: token ?? (await issueWalineToken(user.id, slug)),
        display_name: user.name || user.email || "用户",
        email: user.email || "",
        url: user.url || "",
        avatar: user.avatar || "",
        type: ctx.instance?.userId === user.id ? "administrator" : "guest",
      },
    },
    200,
    request,
  );
}
