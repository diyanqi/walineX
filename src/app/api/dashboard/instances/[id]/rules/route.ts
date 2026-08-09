import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
import { requireOwnedInstance } from "@/lib/dashboard";
import { jsonResponse } from "@/lib/http";

const TYPES = new Set([
  "ip_blacklist",
  "user_blacklist",
  "email_blacklist",
  "url_blacklist",
  "nick_blacklist",
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOwnedInstance(id);
    const body = (await request.json()) as { type?: string; value?: string };
    const type = String(body.type || "");
    const value = String(body.value || "").trim().slice(0, 200);
    if (!TYPES.has(type)) throw new ApiError("不支持的黑名单类型");
    if (!value) throw new ApiError("规则值不能为空");
    const item = await prisma.moderationRule.create({
      data: {
        instanceId: id,
        type: type as never,
        value,
      },
    });
    return jsonResponse({ errno: 0, data: item }, 201, request);
  } catch (error) {
    return apiError(error);
  }
}
