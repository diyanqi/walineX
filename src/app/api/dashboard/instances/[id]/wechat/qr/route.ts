import type { NextRequest } from "next/server";
import { requireOwnedInstance } from "@/lib/dashboard";
import { ApiError, apiError } from "@/lib/api";
import { startWechatQr } from "@/lib/wechat";
import { jsonResponse } from "@/lib/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOwnedInstance(id);
    const qr = await startWechatQr();
    return jsonResponse({ errno: 0, data: qr }, 200, request);
  } catch (error) {
    if (error instanceof ApiError) return apiError(error);
    console.error("WeChat QR start failed", error);
    return jsonResponse(
      { errno: 500, errmsg: error instanceof Error ? error.message : "二维码获取失败" },
      500,
      request,
    );
  }
}
