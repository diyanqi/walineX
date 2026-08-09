import type { NextRequest } from "next/server";
import { authorizeUrl, isSafeOAuthRedirect } from "@/lib/oauth";
import { signState, randomToken } from "@/lib/crypto";
import { verifyCapToken } from "@/lib/cap";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { errorResponse, jsonResponse } from "@/lib/http";

const PROVIDERS = new Set(["github", "google"]);

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const search = request.nextUrl.searchParams;
  const redirect = search.get("redirect") || "/dashboard";
  const capToken = search.get("capToken") ?? undefined;
  return startAuth(request, provider, redirect, capToken);
}

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    redirect?: string;
    capToken?: string;
  };
  return startAuth(request, provider, body.redirect || "/dashboard", body.capToken);
}

async function startAuth(request: NextRequest, provider: string, redirect: string, capToken?: string) {
  if (!PROVIDERS.has(provider)) {
    return errorResponse(400, "不支持的登录方式", request);
  }
  const limit = await rateLimit(`oauth:${clientIp(request)}`, 20, 60);
  if (!limit.allowed) return errorResponse(429, "登录尝试过于频繁", request);
  const capVerified =
    Boolean(capToken) &&
    ((await verifyCapToken(capToken, "login")) ||
      (await verifyCapToken(capToken, "registration")));
  if (!capVerified) {
    return errorResponse(400, "请先完成人机验证", request);
  }
  const safeRedirect = isSafeOAuthRedirect(redirect);
  if (!safeRedirect) return errorResponse(400, "无效的回跳地址", request);
  const state = signState({
    provider,
    redirect: safeRedirect,
    nonce: randomToken(8),
  });
  return jsonResponse(
    { errno: 0, data: { redirectUrl: authorizeUrl(provider as "github" | "google", state) } },
    200,
    request,
  );
}
