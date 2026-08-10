"use client";

import * as React from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlansManagerProps {
  currentPlan: Plan;
  planExpiresAt: string | null;
  paidMessage?: string | null;
}

const PLAN_KEYS: Plan[] = ["free", "starter", "pro"];

const FEATURES: Record<Plan, string[]> = {
  free: ["1 个评论实例", "每月 1,000 条评论", "累计 5,000 条评论", "敏感词与黑名单审核", "PoW 人机验证"],
  starter: ["3 个评论实例", "每月 100,000 条评论", "累计 1,000,000 条评论", "AI 垃圾审核", "微信通知"],
  pro: ["10 个评论实例", "每月 1,000,000 条评论", "累计 10,000,000 条评论", "AI 垃圾审核", "微信通知"],
};

function formatPrice(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

export function PlansManager({
  currentPlan,
  planExpiresAt,
  paidMessage,
}: PlansManagerProps) {
  const [busy, setBusy] = React.useState<{ plan: Plan; period: "month" | "year" } | null>(null);
  const [error, setError] = React.useState("");

  async function purchase(plan: Plan, period: "month" | "year") {
    setBusy({ plan, period });
    setError("");
    try {
      const response = await fetch("/api/plans/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, period }),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: { redirectUrl?: string };
      };
      if (!response.ok || !payload.data?.redirectUrl) {
        setError(payload.errmsg || "下单失败，请稍后重试");
        return;
      }
      window.location.assign(payload.data.redirectUrl);
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">计划</h1>
          <p className="text-sm text-muted-foreground">
            当前套餐：{PLANS[currentPlan].name}
            {planExpiresAt ? `，有效期至 ${new Date(planExpiresAt).toLocaleDateString("zh-CN")}` : ""}
          </p>
        </div>
        <Badge variant="secondary">易支付</Badge>
      </div>

      {paidMessage ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {paidMessage}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_KEYS.map((key) => {
          const plan = PLANS[key];
          const featured = key === "starter";
          const current = key === currentPlan;
          return (
            <Card
              key={key}
              className={cn(
                "flex flex-col",
                featured && "border-primary/50 shadow-lg shadow-primary/10",
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {current ? <Badge variant="success">当前套餐</Badge> : null}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-semibold tracking-tight text-foreground">
                    ¥{formatPrice(plan.priceMonthly)}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">/ 月</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-xs text-muted-foreground">
                  年付 ¥{formatPrice(plan.priceYearly)}，相当于 10 个月费用。
                </p>
                <div className="mt-5 flex-1 space-y-2.5 text-sm">
                  {FEATURES[key].map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                {key === "free" ? (
                  <Button className="mt-6 w-full" variant="outline" disabled>
                    免费版无需购买
                  </Button>
                ) : (
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <Button
                      variant={featured ? "default" : "outline"}
                      onClick={() => void purchase(key, "month")}
                      disabled={busy !== null}
                    >
                      {busy?.plan === key && busy.period === "month" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <CreditCard />
                      )}
                      月付
                    </Button>
                    <Button
                      variant={featured ? "default" : "outline"}
                      onClick={() => void purchase(key, "year")}
                      disabled={busy !== null}
                    >
                      {busy?.plan === key && busy.period === "year" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <CreditCard />
                      )}
                      年付
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
