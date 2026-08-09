import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, requireApiUser } from "@/lib/api";
import { jsonResponse } from "@/lib/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ objectId: string }> },
) {
  try {
    const user = await requireApiUser();
    const objectId = Number((await context.params).objectId);
    const comment = await prisma.comment.findFirst({
      where: {
        objectId,
        deletedAt: null,
        instance: { userId: user.id },
      },
    });
    if (!comment) throw new ApiError("评论不存在", 404);
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (typeof body.status === "string") {
      if (!["approved", "waiting", "spam"].includes(body.status)) {
        throw new ApiError("无效的评论状态");
      }
      data.status = body.status;
      data.moderatedBy = "admin";
      data.moderatedAt = new Date();
    }
    if (typeof body.sticky === "boolean") data.sticky = body.sticky;
    if (Object.keys(data).length === 0) throw new ApiError("没有可更新的字段");
    const updated = await prisma.comment.update({
      where: { objectId },
      data: data as never,
    });
    return jsonResponse({ errno: 0, data: updated }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ objectId: string }> },
) {
  try {
    const user = await requireApiUser();
    const objectId = Number((await context.params).objectId);
    const comment = await prisma.comment.findFirst({
      where: {
        objectId,
        deletedAt: null,
        instance: { userId: user.id },
      },
    });
    if (!comment) throw new ApiError("评论不存在", 404);
    await prisma.comment.update({
      where: { objectId },
      data: { deletedAt: new Date() },
    });
    return jsonResponse({ errno: 0, data: { ok: true } }, 200);
  } catch (error) {
    return apiError(error);
  }
}
