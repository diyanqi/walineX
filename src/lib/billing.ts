import type { Plan, SubscriptionProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import type { PlanPeriod } from "@/lib/epay";

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
  const limits = PLANS[plan];

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { plan, planExpiresAt },
    });
    await tx.instance.updateMany({
      where: { userId, deletedAt: null },
      data: {
        monthlyCommentLimit: limits.monthlyComments,
        totalCommentLimit: limits.totalComments,
      },
    });
    await tx.subscription.upsert({
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
      },
      update: {
        currentPeriodStart: now,
        currentPeriodEnd: planExpiresAt,
      },
    });
  });
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
