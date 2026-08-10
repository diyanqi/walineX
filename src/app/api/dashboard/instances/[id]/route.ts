import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
import { requireOwnedInstance } from "@/lib/dashboard";
import { instanceUrl } from "@/lib/env";
import { jsonResponse } from "@/lib/http";
import { parseTargetOrigins } from "@/lib/cors";
import { planLimits } from "@/lib/plans";

const STATUSES = new Set(["active", "disabled", "suspended"]);

function publicInstance(instance: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  targetOrigins: string[];
  status: string;
  createdAt: Date;
  notifyNewComment: boolean;
  notifyReply: boolean;
  notifyModeration: boolean;
  wechatNotificationEnabled: boolean;
  wechatBotTokenEncrypted: string | null;
  wechatBaseUrl: string | null;
  wechatUserId: string | null;
}) {
  return {
    id: instance.id,
    slug: instance.slug,
    name: instance.name,
    description: instance.description,
    targetOrigins: instance.targetOrigins,
    status: instance.status,
    createdAt: instance.createdAt,
    url: instanceUrl(instance.slug),
    apiUrl: `${instanceUrl(instance.slug)}/api`,
    notifyNewComment: instance.notifyNewComment,
    notifyReply: instance.notifyReply,
    notifyModeration: instance.notifyModeration,
    wechatNotificationEnabled: instance.wechatNotificationEnabled,
    wechatBound: Boolean(
      instance.wechatBotTokenEncrypted &&
        instance.wechatBaseUrl &&
        instance.wechatUserId,
    ),
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const instance = await requireOwnedInstance(id);
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim().slice(0, 80);
    }
    if (typeof body.description === "string") {
      data.description = body.description.trim().slice(0, 500) || null;
    }
    if (body.targetOrigins !== undefined) {
      const targetOrigins = parseTargetOrigins(body.targetOrigins);
      if (targetOrigins === null) {
        throw new ApiError("目标地址格式不正确");
      }
      data.targetOrigins = { set: targetOrigins };
    }
    if (typeof body.status === "string" && STATUSES.has(body.status)) {
      data.status = body.status;
    }
    const notificationKeys = [
      "notifyNewComment",
      "notifyReply",
      "notifyModeration",
      "wechatNotificationEnabled",
    ] as const;
    if (notificationKeys.some((key) => key in body)) {
      const owner = await prisma.user.findUnique({
        where: { id: instance.userId },
        select: { plan: true },
      });
      if (!owner || !planLimits(owner.plan).wechatNotifications) {
        throw new ApiError("当前套餐不包含微信通知，请升级后重试", 403);
      }
    }
    if (typeof body.slug === "string" && body.slug.trim()) {
      const slug = body.slug.trim().toLowerCase();
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
        throw new ApiError("实例标识格式不正确");
      }
      if (slug === "tenant") {
        throw new ApiError("该实例标识不可用");
      }
      const exists = await prisma.instance.findFirst({
        where: { slug, NOT: { id: instance.id } },
      });
      if (exists) throw new ApiError("该实例标识已被占用");
      data.slug = slug;
    }
    for (const key of ["notifyNewComment", "notifyReply", "notifyModeration"] as const) {
      if (typeof body[key] === "boolean") data[key] = body[key];
    }
    if (typeof body.wechatNotificationEnabled === "boolean") {
      data.wechatNotificationEnabled = body.wechatNotificationEnabled;
    }
    if (Object.keys(data).length === 0) throw new ApiError("没有可更新的字段");

    const updated = await prisma.instance.update({
      where: { id },
      data: data as never,
    });
    return jsonResponse(
      { errno: 0, data: publicInstance(updated) },
      200,
      request,
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOwnedInstance(id);
    await prisma.instance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return jsonResponse({ errno: 0, data: { ok: true } }, 200);
  } catch (error) {
    return apiError(error);
  }
}
