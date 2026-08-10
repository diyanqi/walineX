import type { NextRequest } from "next/server";
import { requireOwnedInstance } from "@/lib/dashboard";
import { ApiError, apiError } from "@/lib/api";
import { fetchQrImage } from "@/lib/wechat";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOwnedInstance(id);
    const qrcode = request.nextUrl.searchParams.get("qrcode");
    const img = request.nextUrl.searchParams.get("img");
    if (!qrcode) throw new ApiError("缺少二维码参数", 400);
    const { buffer, contentType } = await fetchQrImage(qrcode, img || undefined);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return apiError(error);
    console.error("WeChat QR image proxy failed", error);
    return new Response(error instanceof Error ? error.message : "二维码获取失败", {
      status: 500,
    });
  }
}
