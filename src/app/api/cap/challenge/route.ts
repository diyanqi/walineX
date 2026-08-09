import { createCapChallenge, CAP_SCOPES } from "@/lib/cap";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { errorResponse, jsonResponse } from "@/lib/http";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") || "login";
  return handle(scope, request);
}

export async function POST(request: NextRequest) {
  let scope = "login";
  try {
    const body = (await request.json()) as { scope?: string };
    scope = body.scope || "login";
  } catch {
    // default scope
  }
  return handle(scope, request);
}

async function handle(scope: string, request: NextRequest) {
  const valid = Object.values(CAP_SCOPES).includes(scope as never);
  if (!valid) return errorResponse(400, "不支持的验证场景", request);
  const limit = await rateLimit(`cap:${clientIp(request)}`, 30, 60);
  if (!limit.allowed) return errorResponse(429, "验证请求过于频繁", request);
  const challenge = await createCapChallenge(scope as keyof typeof CAP_SCOPES);
  return jsonResponse({ errno: 0, data: challenge }, 200, request);
}
