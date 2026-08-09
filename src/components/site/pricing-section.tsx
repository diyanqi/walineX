import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES: Record<keyof typeof PLANS, Array<{ label: string; available?: boolean }>> = {
  free: [
    { label: "1 个评论实例" },
    { label: "每月 5,000 条评论" },
    { label: "累计 50,000 条评论" },
    { label: "敏感词与黑名单审核" },
    { label: "PoW 人机验证" },
    { label: "邮件通知", available: false },
    { label: "Akismet 垃圾过滤", available: false },
    { label: "AI 审核", available: false },
  ],
  starter: [
    { label: "3 个评论实例" },
    { label: "每月 100,000 条评论" },
    { label: "累计 1,000,000 条评论" },
    { label: "邮件通知" },
    { label: "Akismet 垃圾过滤" },
    { label: "AI 审核" },
    { label: "优先支持" },
  ],
  pro: [
    { label: "10 个评论实例" },
    { label: "每月 1,000,000 条评论" },
    { label: "累计 10,000,000 条评论" },
    { label: "邮件通知" },
    { label: "Akismet 垃圾过滤" },
    { label: "AI 审核" },
    { label: "专属支持与 SLA" },
  ],
};

export function PricingSection({ compact = false }: { compact?: boolean }) {
  const plans = compact ? ["free", "starter", "pro"] : ["free", "starter", "pro"];
  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
      {plans.map((key) => {
        const plan = PLANS[key as keyof typeof PLANS];
        const featured = key === "starter";
        return (
          <div
            key={key}
            className={cn(
              "flex flex-col rounded-lg border bg-background p-6",
              featured && "border-primary/50 shadow-lg shadow-primary/10",
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{plan.name}</h3>
              {featured ? (
                <Badge className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  推荐
                </Badge>
              ) : null}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                ¥{plan.priceMonthly}
              </span>
              <span className="text-sm text-muted-foreground">/ 月</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              年付 ¥{plan.priceYearly}
            </p>
            <div className="mt-5 space-y-2.5 border-t pt-5 text-sm">
              {FEATURES[key as keyof typeof PLANS].map((feature) => (
                <div key={feature.label} className="flex items-start gap-2">
                  {feature.available === false ? (
                    <span className="mt-0.5 h-4 w-4 rounded-full border text-center text-[10px] leading-4 text-muted-foreground">
                      –
                    </span>
                  ) : (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  )}
                  <span className={feature.available === false ? "text-muted-foreground" : ""}>
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/register" className="mt-6 block">
              <Button className="w-full" variant={featured ? "default" : "outline"}>
                {plan.priceMonthly === 0 ? "免费开始" : "开始使用"}
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
