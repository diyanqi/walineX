import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
import { requireOwnedInstance } from "@/lib/dashboard";
import { encryptSecret } from "@/lib/crypto";
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
            akismetEnabled: instance.akismetEnabled,
            akismetConfigured: Boolean(
              instance.akismetKeyEncrypted || env("AKISMET_API_KEY"),
            ),
            aiModerationEnabled: instance.aiModerationEnabled,
            aiApiBaseUrl: instance.aiApiBaseUrl,
            aiModel: instance.aiModel,
            aiConfigured: Boolean(instance.aiApiKeyEncrypted || env("AI_MODERATION_API_KEY")),
            allowAnonymous: instance.allowAnonymous,
            requireCap: instance.requireCap,
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
    await requireOwnedInstance(id);
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    for (const key of [
      "moderationEnabled",
      "akismetEnabled",
      "aiModerationEnabled",
      "allowAnonymous",
      "requireCap",
    ] as const) {
      if (typeof body[key] === "boolean") data[key] = body[key];
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
    if (typeof body.aiApiBaseUrl === "string") {
      data.aiApiBaseUrl = body.aiApiBaseUrl.trim() || null;
    }
    if (typeof body.aiModel === "string") {
      data.aiModel = body.aiModel.trim() || null;
    }
    if ("akismetKey" in body) {
      data.akismetKeyEncrypted =
        body.akismetKey == null ? null : String(body.akismetKey).startsWith("enc:")
          ? String(body.akismetKey)
          : String(body.akismetKey)
            ? encryptSecret(String(body.akismetKey))
            : data.akismetKeyEncrypted;
    }
    if ("aiApiKey" in body) {
      data.aiApiKeyEncrypted =
        body.aiApiKey == null ? null : String(body.aiApiKey).startsWith("enc:")
          ? String(body.aiApiKey)
          : String(body.aiApiKey)
            ? encryptSecret(String(body.aiApiKey))
            : data.aiApiKeyEncrypted;
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
