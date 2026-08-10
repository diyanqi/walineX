import type { NextRequest } from "next/server";
import { ApiError, apiError, requireApiUser } from "@/lib/api";
import { redeemRedeemCode } from "@/lib/redeem";
import { jsonResponse } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    if (!body.code?.trim()) throw new ApiError("请输入兑换码");
    const result = await redeemRedeemCode(user.id, body.code);
    return jsonResponse({ errno: 0, data: result }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}
