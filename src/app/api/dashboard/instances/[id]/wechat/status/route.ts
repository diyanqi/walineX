import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnedInstance } from "@/lib/dashboard";
import { encryptSecret } from "@/lib/crypto";
import { pollWechatQr } from "@/lib/wechat";
import { jsonResponse } from "@/lib/http";

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const instance = await requireOwnedInstance(id);
    const qrcode = request.nextUrl.searchParams.get("qrcode");
    if (!qrcode) {
      return jsonResponse({ errno: 400, errmsg: "缺少二维码参数" }, 400, request);
    }
    const result = await pollWechatQr(qrcode);
    const connected =
      result.status === "confirmed" &&
      Boolean(result.botToken && result.baseUrl && result.userId);
    if (connected) {
      const baseUrl = normalizeBaseUrl(result.baseUrl);
      if (!baseUrl) {
        return jsonResponse(
          { errno: 500, errmsg: "微信未返回服务地址" },
          500,
          request,
        );
      }
      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          wechatBotTokenEncrypted: encryptSecret(result.botToken!),
          wechatBotId: result.botId || null,
          wechatBaseUrl: baseUrl,
          wechatUserId: result.userId!,
          wechatNotificationEnabled: true,
        },
      });
    }
    return jsonResponse({ errno: 0, data: { ...result, connected } }, 200, request);
  } catch (error) {
    console.error("WeChat QR status failed", error);
    return jsonResponse(
      { errno: 500, errmsg: error instanceof Error ? error.message : "二维码状态获取失败" },
      500,
      request,
    );
  }
}
