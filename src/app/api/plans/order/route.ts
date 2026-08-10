import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, requireApiUser } from "@/lib/api";
import { epayOrderUrl, type PlanPeriod } from "@/lib/epay";
import { planPrice } from "@/lib/billing";
import { jsonResponse } from "@/lib/http";

const PLANS = new Set<Plan>(["starter", "pro"]);
const PERIODS = new Set<PlanPeriod>(["month", "year"]);

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = (await request.json().catch(() => ({}))) as {
      plan?: string;
      period?: string;
      type?: "wxpay" | "alipay" | "qqpay";
    };
    const plan = body.plan as Plan;
    const period = body.period as PlanPeriod;
    if (!PLANS.has(plan) || !PERIODS.has(period)) {
      throw new ApiError("套餐或周期无效");
    }
    const outTradeNo = `EP${Date.now()}${randomBytes(8).toString("hex").toUpperCase()}`;
    const amount = planPrice(plan, period);
    const order = await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        plan,
        period,
        amount,
        provider: "epay",
        outTradeNo,
      },
    });
    const redirectUrl = epayOrderUrl({
      outTradeNo: order.outTradeNo,
      plan,
      period,
      type: body.type || "wxpay",
    });
    return jsonResponse({ errno: 0, data: { redirectUrl } }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}
