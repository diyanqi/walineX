import type { NextRequest } from "next/server";
import { redeemCap, CAP_SCOPES } from "@/lib/cap";
import { jsonResponse } from "@/lib/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scope: string }> },
) {
  const { scope } = await context.params;
  if (!Object.values(CAP_SCOPES).includes(scope as never)) {
    return jsonResponse({ success: false, error: "不支持的验证场景" }, 400, request);
  }
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    solutions?: unknown;
    instr?: unknown;
  };
  const result = await redeemCap(body, scope as keyof typeof CAP_SCOPES);
  if (!result.success) {
    return jsonResponse({ success: false, error: "人机验证失败，请重试" }, 400, request);
  }
  return jsonResponse(
    { success: true, token: result.token, expires: result.expires },
    200,
    request,
  );
}
