import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Blocks,
  Bot,
  CheckCircle2,
  Globe2,
  MessageSquareText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroPreview } from "@/components/site/hero-preview";
import { PricingSection } from "@/components/site/pricing-section";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Waline 兼容托管评论服务",
  description:
    "为博客和独立站点提供 Waline 兼容的托管评论服务。多实例、PoW 人机验证、智能审核、邮件通知，即刻接入。",
};

const FEATURES = [
  {
    icon: Blocks,
    title: "多实例托管",
    description: "一个账号创建多个独立评论实例，每个实例拥有专属 API 地址和独立配置。",
  },
  {
    icon: MessageSquareText,
    title: "Waline 兼容",
    description: "保留 Waline 的 API 契约与登录弹窗流程，现有客户端无需修改即可接入。",
  },
  {
    icon: ShieldCheck,
    title: "PoW 人机验证",
    description: "注册、登录、创建实例和发表评论前完成免图片的 Proof-of-Work 验证。",
  },
  {
    icon: Bot,
    title: "智能审核",
    description: "敏感词、IP 与用户黑名单、Akismet 垃圾过滤，以及可替换的 AI 审核接口。",
  },
  {
    icon: BellRing,
    title: "邮件通知",
    description: "新评论、回复和待审核事件通过异步队列发送邮件，不阻塞评论提交。",
  },
  {
    icon: Zap,
    title: "用量与限制",
    description: "按套餐限制实例数与评论量，通过月度使用记录和限流保护服务稳定。",
  },
];

const FAQS = [
  {
    question: "我可以用原来的 Waline 客户端吗？",
    answer:
      "可以。无尽书证实现了 Waline 兼容的评论、用户、文章与 Token API，将服务端地址替换为你的实例地址即可继续使用。",
  },
  {
    question: "实例地址是什么样？",
    answer:
      "创建实例后会自动生成 https://instance.waline.infvar.com/{实例标识}，例如 https://instance.waline.infvar.com/myblog，无需绑定自定义域名。",
  },
  {
    question: "评论会经过哪些审核？",
    answer:
      "评论会按顺序经过黑名单规则、敏感词、Akismet 与 AI 审核，命中规则后可拦截、替换或转入待审核。",
  },
  {
    question: "免费套餐可以长期使用吗？",
    answer:
      "可以。免费套餐提供 1 个实例和每月 5,000 条评论，适合个人博客和小流量站点长期使用。",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b bg-[#0c1d24] text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-16 sm:px-6 sm:pt-20 lg:px-8">
            <div className="max-w-3xl">
              <Badge className="border-white/15 bg-white/10 text-white">
                <Globe2 className="h-3 w-3" />
                Waline 兼容 · 即刻替换服务端
              </Badge>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                让每个网站
                <br />
                拥有可托管的评论系统
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                无尽书证是 Waline 兼容的托管评论服务。创建实例、替换服务端地址，即可获得多租户管理、
                PoW 人机验证、智能审核与邮件通知。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-400 px-5 text-sm font-semibold text-[#0c1d24] shadow-lg shadow-teal-400/20 transition-colors hover:bg-teal-300"
                >
                  免费创建实例
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  阅读接入文档
                </Link>
              </div>
            </div>
            <div className="mt-12 translate-y-px">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section id="features" className="border-b">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">产品能力</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                从接入到审核，一条完整链路
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                把评论基础设施交给平台，你只需要专注内容创作和读者互动。
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-lg border bg-background p-6 transition-colors hover:border-primary/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">三步接入</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  替换服务端地址即可继续工作
                </h2>
                <div className="mt-8 space-y-5">
                  {[
                    {
                      title: "创建账号与实例",
                      description: "使用 GitHub 或 Google 登录，免费套餐即可创建第一个实例。",
                    },
                    {
                      title: "复制 API 地址",
                      description: "在控制台复制 https://instance.waline.infvar.com/{实例标识}/api 作为服务端地址。",
                    },
                    {
                      title: "更新 Waline 配置",
                      description: "保持现有 Waline 客户端不变，将 serverURL 指向实例地址即可。",
                    },
                  ].map((step, index) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/docs"
                  className="mt-8 inline-flex h-10 items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent"
                >
                  查看集成文档
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="min-w-0 rounded-lg border bg-background p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-5 w-5 text-primary" />
                  <p className="font-semibold">接入示例</p>
                </div>
                <pre className="mt-4 overflow-x-auto rounded-md bg-[#0c1d24] p-5 text-xs leading-6 text-white/80">
                  <code>{`<script>
  const waline = new Waline({
    el: "#comments",
    serverURL: "https://instance.waline.infvar.com/myblog",
    path: location.pathname,
    lang: "zh-CN"
  });
</script>`}</code>
                </pre>
                <div className="mt-4 grid gap-2 text-sm">
                  {[
                    "无需自建服务器",
                    "评论 API 与 Waline 契约一致",
                    "登录弹窗沿用 Waline 协议",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-primary">定价</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                从免费开始，随流量成长
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                所有套餐都包含 Waline 兼容 API、PoW 验证与基础审核能力。
              </p>
            </div>
            <div className="mt-10">
              <PricingSection />
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">常见问题</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">FAQ</h2>
            </div>
            <div className="mt-10 divide-y rounded-lg border bg-background">
              {FAQS.map((faq) => (
                <details key={faq.question} className="group px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                    {faq.question}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-[#0c1d24] px-6 py-14 text-center text-white sm:px-12">
              <h2 className="text-3xl font-semibold tracking-tight">
                现在就把评论迁移到无尽书证
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65">
                免费创建实例，完成 PoW 验证后立即获得专属 API 地址。
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-400 px-5 text-sm font-semibold text-[#0c1d24] hover:bg-teal-300"
                >
                  免费开始
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10"
                >
                  查看定价
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
