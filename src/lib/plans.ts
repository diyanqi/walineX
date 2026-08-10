import type { Plan } from "@prisma/client";

export interface PlanLimits {
  name: string;
  instances: number;
  monthlyComments: number;
  totalComments: number;
  likesPerMinute: number;
  commentsPerMinute: number;
  aiModeration: boolean;
  wechatNotifications: boolean;
  priceMonthly: number;
  priceYearly: number;
}

export const PLANS: Record<Plan, PlanLimits> = {
  free: {
    name: "免费版",
    instances: 1,
    monthlyComments: 1_000,
    totalComments: 5_000,
    likesPerMinute: 30,
    commentsPerMinute: 6,
    aiModeration: false,
    wechatNotifications: false,
    priceMonthly: 0,
    priceYearly: 0,
  },
  starter: {
    name: "起步版",
    instances: 3,
    monthlyComments: 100_000,
    totalComments: 1_000_000,
    likesPerMinute: 120,
    commentsPerMinute: 30,
    aiModeration: true,
    wechatNotifications: true,
    priceMonthly: 3.9,
    priceYearly: 39,
  },
  pro: {
    name: "专业版",
    instances: 10,
    monthlyComments: 1_000_000,
    totalComments: 10_000_000,
    likesPerMinute: 600,
    commentsPerMinute: 120,
    aiModeration: true,
    wechatNotifications: true,
    priceMonthly: 19.9,
    priceYearly: 199,
  },
};

export function planLimits(plan: Plan): PlanLimits {
  return PLANS[plan];
}
