import type { Instance, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/lib/plans";

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function countActiveInstances(userId: string): Promise<number> {
  return prisma.instance.count({
    where: { userId, deletedAt: null },
  });
}

export async function canCreateInstance(user: User): Promise<{
  ok: boolean;
  message?: string;
}> {
  const limits = planLimits(user.plan);
  const active = await countActiveInstances(user.id);
  if (active >= limits.instances) {
    return {
      ok: false,
      message: `当前套餐最多创建 ${limits.instances} 个实例，请升级套餐。`,
    };
  }
  return { ok: true };
}

export async function getMonthlyUsage(instanceId: string, month = currentMonth()) {
  return prisma.usageRecord.findUnique({
    where: { instanceId_month: { instanceId, month } },
  });
}

export async function getTotalCommentCount(instanceId: string): Promise<number> {
  return prisma.comment.count({
    where: { instanceId, deletedAt: null },
  });
}

export async function assertCommentCapacity(instance: Instance): Promise<{
  ok: boolean;
  message?: string;
}> {
  const [monthly, total] = await Promise.all([
    getMonthlyUsage(instance.id),
    getTotalCommentCount(instance.id),
  ]);
  if ((monthly?.commentCount ?? 0) >= instance.monthlyCommentLimit) {
    return {
      ok: false,
      message: "本月评论额度已用完，请升级套餐或等待下月重置。",
    };
  }
  if (total >= instance.totalCommentLimit) {
    return {
      ok: false,
      message: "实例累计评论额度已用完，请升级套餐。",
    };
  }
  return { ok: true };
}

export function instanceLimitsFromPlan(plan: User["plan"]) {
  const limits = planLimits(plan);
  return {
    monthlyCommentLimit: limits.monthlyComments,
    totalCommentLimit: limits.totalComments,
  };
}
