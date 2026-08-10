import { randomBytes } from "node:crypto";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPlanDurationWithDb } from "@/lib/billing";
import { ApiError } from "@/lib/api";

export function generateRedeemCode(): string {
  const raw = randomBytes(6).toString("hex").toUpperCase();
  return `WALINE-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export async function createRedeemCodes(options: {
  createdBy: string;
  plan: Plan;
  durationDays: number;
  maxUses: number;
  expiresAt?: Date | null;
  count: number;
  code?: string;
}) {
  const { createdBy, plan, durationDays, maxUses, expiresAt, count, code } = options;
  const created = [];
  for (let index = 0; index < count; index += 1) {
    const nextCode = (code || generateRedeemCode()).toUpperCase().trim();
    created.push(
      await prisma.redeemCode.create({
        data: {
          code: nextCode,
          plan,
          durationDays,
          maxUses,
          expiresAt: expiresAt || null,
          createdBy,
        },
      }),
    );
  }
  return created;
}

export async function redeemRedeemCode(userId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  const found = await prisma.redeemCode.findUnique({ where: { code } });
  if (!found) throw new ApiError("兑换码不存在");
  const now = new Date();
  if (found.expiresAt && found.expiresAt < now) {
    throw new ApiError("兑换码已过期");
  }
  if (found.usedCount >= found.maxUses) {
    throw new ApiError("兑换码已被使用完");
  }
  const existing = await prisma.redemptionUsage.findUnique({
    where: { codeId_userId: { codeId: found.id, userId } },
  });
  if (existing) throw new ApiError("你已兑换过该兑换码");

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.redeemCode.updateMany({
      where: {
        id: found.id,
        usedCount: { lt: found.maxUses },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw new ApiError("兑换码已用完或已过期");
    }
    try {
      await tx.redemptionUsage.create({
        data: { codeId: found.id, userId },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ApiError("你已兑换过该兑换码");
      }
      throw error;
    }
    const planExpiresAt = await applyPlanDurationWithDb(
      tx,
      userId,
      found.plan,
      found.durationDays,
      "manual",
      found.code,
    );
    return { plan: found.plan, durationDays: found.durationDays, planExpiresAt };
  });
}
