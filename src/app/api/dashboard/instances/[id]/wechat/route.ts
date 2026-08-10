import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnedInstance } from "@/lib/dashboard";
import { jsonResponse } from "@/lib/http";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOwnedInstance(id);
    await prisma.instance.update({
      where: { id },
      data: {
        wechatNotificationEnabled: false,
        wechatBotTokenEncrypted: null,
        wechatBotId: null,
        wechatBaseUrl: null,
        wechatUserId: null,
      },
    });
    return jsonResponse({ errno: 0, data: { ok: true } }, 200, request);
  } catch (error) {
    return jsonResponse(
      { errno: 500, errmsg: error instanceof Error ? error.message : "解绑失败" },
      500,
      request,
    );
  }
}
