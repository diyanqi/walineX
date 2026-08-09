import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PricingSection } from "@/components/site/pricing-section";

export const metadata: Metadata = {
  title: "定价",
  description: "无尽书证的免费、起步和专业套餐，按实例与评论量灵活扩展。",
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-primary">定价</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              简单透明的评论托管价格
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              免费套餐适合个人博客，付费套餐适合流量增长中的内容站与团队站点。
            </p>
          </div>
        </section>
        <section className="py-16">
          <PricingSection />
        </section>
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">升级需要怎么做？</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  登录控制台后联系平台开通新套餐。套餐生效后实例数量、评论额度和高级审核能力会立即解锁。
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">超过评论额度会怎样？</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  超过月度额度后新评论会进入待审核状态，不会直接丢失；升级套餐或等待下个周期后恢复。
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-lg border bg-background px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="font-semibold">还不确定选哪个套餐？</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  免费套餐已经包含完整 Waline 兼容能力，随时可以升级。
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                免费开始
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
