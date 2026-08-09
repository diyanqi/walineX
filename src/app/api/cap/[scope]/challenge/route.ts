import type { NextRequest } from "next/server";
import { createCapChallenge, CAP_SCOPES } from "@/lib/cap";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { jsonResponse } from "@/lib/http";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scope: string }> },
) {
  const { scope } = await context.params;
  return handle(scope, request);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scope: string }> },
) {
  const { scope } = await context.params;
  return handle(scope, request);
}

async function handle(scope: string, request: NextRequest) {
  if (!Object.values(CAP_SCOPES).includes(scope as never)) {
    return jsonResponse({ error: "不支持的验证场景" }, 400, request);
  }
  const limit = await rateLimit(`cap:${clientIp(request)}`, 30, 60);
  if (!limit.allowed) return jsonResponse({ error: "验证请求过于频繁" }, 429, request);
  const challenge = await createCapChallenge(scope as keyof typeof CAP_SCOPES);
  return jsonResponse(challenge, 200, request);
}
