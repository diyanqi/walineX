import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
import { requireOwnedInstance } from "@/lib/dashboard";
import { jsonResponse } from "@/lib/http";

const ACTIONS = new Set(["block", "replace", "review"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireOwnedInstance(id);
    const body = (await request.json()) as {
      word?: string;
      action?: string;
      replacement?: string;
    };
    const word = String(body.word || "").trim().slice(0, 100);
    if (!word) throw new ApiError("敏感词不能为空");
    const action = body.action && ACTIONS.has(body.action) ? body.action : "review";
    const item = await prisma.sensitiveWord.create({
      data: {
        instanceId: id,
        word,
        action: action as "block" | "replace" | "review",
        replacement: body.replacement?.slice(0, 50) || null,
      },
    });
    return jsonResponse({ errno: 0, data: item }, 201, request);
  } catch (error) {
    return apiError(error);
  }
}
