import { redeemCap, CAP_SCOPES } from "@/lib/cap";
import { errorResponse, jsonResponse } from "@/lib/http";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    token?: string;
    solutions?: unknown;
    instr?: unknown;
    scope?: string;
  };
  const scope = String(body.scope || "login");
  if (!Object.values(CAP_SCOPES).includes(scope as never)) {
    return errorResponse(400, "不支持的验证场景", request);
  }
  const result = await redeemCap(body, scope as keyof typeof CAP_SCOPES);
  if (!result.success) {
    return errorResponse(400, "人机验证失败，请重试", request);
  }
  return jsonResponse({ errno: 0, data: { token: result.token, expires: result.expires } }, 200, request);
}
