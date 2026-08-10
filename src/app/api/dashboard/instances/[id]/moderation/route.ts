import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
import { requireOwnedInstance } from "@/lib/dashboard";
import { env } from "@/lib/env";
import { jsonResponse } from "@/lib/http";

const ACTIONS = new Set(["block", "replace", "review"]);
const COMMENT_STATUSES = new Set(["approved", "waiting", "spam"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const instance = await requireOwnedInstance(id);
    const [sensitiveWords, moderationRules] = await Promise.all([
      prisma.sensitiveWord.findMany({
        where: { instanceId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.moderationRule.findMany({
        where: { instanceId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return jsonResponse(
      {
        errno: 0,
        data: {
          instance: {
            id: instance.id,
            slug: instance.slug,
            name: instance.name,
            moderationEnabled: instance.moderationEnabled,
            sensitiveWordMode: instance.sensitiveWordMode,
            defaultCommentStatus: instance.defaultCommentStatus,
            aiModerationEnabled: instance.aiModerationEnabled,
            aiConfigured: Boolean(
              instance.aiApiKeyEncrypted || env("AI_MODERATION_API_KEY"),
            ),
            allowAnonymous: instance.allowAnonymous,
            requireCap: instance.requireCap,
            commentRateLimitMax: instance.commentRateLimitMax,
            commentRateLimitWindowSec: instance.commentRateLimitWindowSec,
          },
          sensitiveWords,
          moderationRules,
        },
      },
      200,
      request,
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const instance = await requireOwnedInstance(id);
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    for (const key of [
      "moderationEnabled",
      "aiModerationEnabled",
      "allowAnonymous",
      "requireCap",
    ] as const) {
      if (typeof body[key] === "boolean") data[key] = body[key];
    }
    if (data.aiModerationEnabled === true) {
      const owner = await prisma.user.findUnique({
        where: { id: instance.userId },
        select: { plan: true },
      });
      if (!owner || owner.plan === "free") {
        throw new ApiError("当前套餐不包含 AI 审核，请升级后重试", 403);
      }
      if (!instance.aiApiKeyEncrypted && !env("AI_MODERATION_API_KEY")) {
        throw new ApiError("平台尚未配置 AI 审核，请联系管理员", 403);
      }
    }
    if (data.moderationEnabled === false && body.defaultCommentStatus === undefined) {
      data.defaultCommentStatus = "approved";
    }
    if (typeof body.sensitiveWordMode === "string" && ACTIONS.has(body.sensitiveWordMode)) {
      data.sensitiveWordMode = body.sensitiveWordMode;
    }
    if (
      typeof body.defaultCommentStatus === "string" &&
      COMMENT_STATUSES.has(body.defaultCommentStatus)
    ) {
      data.defaultCommentStatus = body.defaultCommentStatus;
    }
    if (
      typeof body.commentRateLimitMax === "number" &&
      Number.isInteger(body.commentRateLimitMax) &&
      body.commentRateLimitMax >= 1
    ) {
      data.commentRateLimitMax = Math.min(1000, body.commentRateLimitMax);
    }
    if (
      typeof body.commentRateLimitWindowSec === "number" &&
      Number.isInteger(body.commentRateLimitWindowSec) &&
      body.commentRateLimitWindowSec >= 1
    ) {
      data.commentRateLimitWindowSec = Math.min(86400, body.commentRateLimitWindowSec);
    }
    if (Object.keys(data).length === 0) throw new ApiError("没有可更新的字段");

    await prisma.instance.update({
      where: { id },
      data: data as never,
    });
    return jsonResponse({ errno: 0, data: { ok: true } }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}
