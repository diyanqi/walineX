import type { Plan, Prisma, SubscriptionProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import type { PlanPeriod } from "@/lib/epay";

export type DbClient = Prisma.TransactionClient | typeof prisma;

export function planPrice(plan: Plan, period: PlanPeriod): number {
  return period === "year" ? PLANS[plan].priceYearly : PLANS[plan].priceMonthly;
}

function addPeriod(date: Date, period: PlanPeriod): Date {
  const next = new Date(date);
  if (period === "year") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

async function applyPlanRecord(
  db: DbClient,
  userId: string,
  plan: Plan,
  planExpiresAt: Date,
  provider: SubscriptionProvider,
  externalId?: string,
): Promise<void> {
  const now = new Date();
  const limits = PLANS[plan];
  await db.user.update({
    where: { id: userId },
    data: { plan, planExpiresAt },
  });
  await db.instance.updateMany({
    where: { userId, deletedAt: null },
    data: {
      monthlyCommentLimit: limits.monthlyComments,
      totalCommentLimit: limits.totalComments,
    },
  });
  await db.subscription.upsert({
    where: {
      userId_plan_provider_status: {
        userId,
        plan,
        provider,
        status: "active",
      },
    },
    create: {
      userId,
      plan,
      provider,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: planExpiresAt,
      ...(externalId ? { externalId } : {}),
    },
    update: {
      currentPeriodStart: now,
      currentPeriodEnd: planExpiresAt,
      ...(externalId ? { externalId } : {}),
    },
  });
}

export async function applyPaidPlan(
  userId: string,
  plan: Plan,
  period: PlanPeriod,
  provider: SubscriptionProvider = "epay",
): Promise<void> {
  const now = new Date();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const base =
    user.plan === plan && user.planExpiresAt && user.planExpiresAt > now
      ? user.planExpiresAt
      : now;
  const planExpiresAt = addPeriod(base, period);
  await prisma.$transaction((tx) =>
    applyPlanRecord(tx, userId, plan, planExpiresAt, provider),
  );
}

export async function applyPlanDuration(
  userId: string,
  plan: Plan,
  durationDays: number,
  provider: SubscriptionProvider = "manual",
  externalId?: string,
): Promise<void> {
  await prisma.$transaction((tx) =>
    applyPlanDurationWithDb(tx, userId, plan, durationDays, provider, externalId),
  );
}

export async function applyPlanDurationWithDb(
  db: DbClient,
  userId: string,
  plan: Plan,
  durationDays: number,
  provider: SubscriptionProvider = "manual",
  externalId?: string,
): Promise<Date> {
  if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 3650) {
    throw new Error("时长必须为 1 到 3650 天");
  }
  const now = new Date();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const base =
    user.plan === plan && user.planExpiresAt && user.planExpiresAt > now
      ? user.planExpiresAt
      : now;
  const planExpiresAt = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
  await applyPlanRecord(db, userId, plan, planExpiresAt, provider, externalId);
  return planExpiresAt;
}

export async function activatePaymentOrder(
  orderId: string,
  externalTradeNo: string,
): Promise<{ alreadyPaid: boolean }> {
  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("支付订单不存在");
  const claimed = await prisma.paymentOrder.updateMany({
    where: { id: orderId, status: { not: "paid" } },
    data: {
      status: "paid",
      externalTradeNo,
      paidAt: new Date(),
    },
  });
  if (claimed.count === 0) return { alreadyPaid: true };
  await applyPaidPlan(order.userId, order.plan, order.period as PlanPeriod);
  return { alreadyPaid: false };
}
