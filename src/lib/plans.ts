import type { Plan } from "@prisma/client";

export interface PlanLimits {
  name: string;
  instances: number;
  monthlyComments: number;
  totalComments: number;
  likesPerMinute: number;
  commentsPerMinute: number;
  aiModeration: boolean;
  akismet: boolean;
  emailNotifications: boolean;
  priceMonthly: number;
  priceYearly: number;
}

export const PLANS: Record<Plan, PlanLimits> = {
  free: {
    name: "免费版",
    instances: 1,
    monthlyComments: 5_000,
    totalComments: 50_000,
    likesPerMinute: 30,
    commentsPerMinute: 6,
    aiModeration: false,
    akismet: false,
    emailNotifications: false,
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
    akismet: true,
    emailNotifications: true,
    priceMonthly: 29,
    priceYearly: 290,
  },
  pro: {
    name: "专业版",
    instances: 10,
    monthlyComments: 1_000_000,
    totalComments: 10_000_000,
    likesPerMinute: 600,
    commentsPerMinute: 120,
    aiModeration: true,
    akismet: true,
    emailNotifications: true,
    priceMonthly: 99,
    priceYearly: 990,
  },
};

export function planLimits(plan: Plan): PlanLimits {
  return PLANS[plan];
}
