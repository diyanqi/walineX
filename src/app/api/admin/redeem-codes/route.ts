import type { NextRequest } from "next/server";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, requireAdmin } from "@/lib/api";
import { createRedeemCodes } from "@/lib/redeem";
import { jsonResponse } from "@/lib/http";

const REDEEM_PLANS = new Set<Plan>(["starter", "pro"]);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const codes = await prisma.redeemCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return jsonResponse({ errno: 0, data: codes }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as {
      plan?: string;
      durationDays?: number;
      maxUses?: number;
      expiresAt?: string;
      count?: number;
      code?: string;
    };
    const plan = body.plan as Plan;
    if (!REDEEM_PLANS.has(plan)) throw new ApiError("套餐无效");
    const durationDays = Number(body.durationDays);
    const maxUses = Number(body.maxUses || 1);
    const count = Number(body.count || 1);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      throw new ApiError("时长必须为 1 到 3650 天");
    }
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10_000) {
      throw new ApiError("使用次数必须为 1 到 10000");
    }
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new ApiError("批量数量必须为 1 到 100");
    }
    if (body.code && count !== 1) {
      throw new ApiError("自定义兑换码只能生成 1 个");
    }
    let expiresAt: Date | null = null;
    if (body.expiresAt) {
      expiresAt = new Date(body.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) throw new ApiError("过期时间无效");
    }
    const created = await createRedeemCodes({
      createdBy: admin.id,
      plan,
      durationDays,
      maxUses,
      expiresAt,
      count,
      code: body.code,
    });
    return jsonResponse({ errno: 0, data: created }, 201, request);
  } catch (error) {
    return apiError(error);
  }
}
