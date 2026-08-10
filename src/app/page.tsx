import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Blocks,
  Bot,
  CheckCircle2,
  DatabaseBackup,
  Globe2,
  MessageSquareText,
  Network,
  Quote,
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
    "为博客和独立站点提供 Waline 兼容的托管评论服务。多实例、PoW 人机验证、智能审核、数据迁移与多协议兼容，即刻接入。",
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
    description: "敏感词、IP 与用户黑名单，以及平台统一配置的 AI 垃圾审核。",
  },
  {
    icon: BellRing,
    title: "微信通知",
    description: "新评论、回复和待审核事件直接推送到微信，扫码即可完成绑定。",
  },
  {
    icon: Zap,
    title: "用量与限制",
    description: "按套餐限制实例数与评论量，通过月度使用记录和限流保护服务稳定。",
  },
  {
    icon: DatabaseBackup,
    title: "数据迁移",
    description: "实例编辑页支持 Waline 官方 JSON 导入导出，评论、浏览量和回复关系都能完整迁移。",
  },
  {
    icon: Network,
    title: "多协议兼容",
    description: "主 API 保持 Waline 兼容，同时提供 Twikoo、Artalk、Valine 基础接口。",
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
      "评论会按顺序经过黑名单规则、敏感词与 AI 审核，命中规则后可拦截、替换或转入待审核。",
  },
  {
    question: "免费套餐可以长期使用吗？",
    answer:
      "可以。免费套餐提供 1 个实例、每月 1,000 条评论和累计 5,000 条评论，适合个人博客和小流量站点长期使用。",
  },
  {
    question: "我能从其他评论系统迁移过来吗？",
    answer:
      "可以。实例编辑页支持 Waline 官方 JSON 导入导出，也兼容 Twikoo、Artalk 等常见导出格式；导入后会保留评论状态、时间、回复关系和浏览量数据。",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/70 to-background">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border) / 0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.55) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-16 sm:px-6 sm:pt-20 lg:px-8">
            <div className="max-w-3xl">
              <Badge variant="secondary">
                <Globe2 className="h-3 w-3" />
                Waline 兼容 · 即刻替换服务端
              </Badge>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                让每个网站
                <br />
                拥有可托管的评论系统
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                无尽书证是 Waline 兼容的托管评论服务。创建实例、替换服务端地址，即可获得多租户管理、
                PoW 人机验证、智能审核、数据迁移与微信通知。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
                >
                  免费创建实例
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
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

        <section id="name" className="border-b">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">名字的由来</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                「书证」是中国古代早已有之的评论传统
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                「书证」本指以书为证，是古人读书、治学时的重要方法。从汉代章句到唐代注疏，
                再到清代考据，学者们把考订、辩难与心得写在书页之侧，以文字印证文字，以证据校正
                正文，彼此切磋，层层推进。
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                今天的评论，正是这一传统在网络时代的延续：读者在文章旁边写下见解、提问与补充，
                为正文提供注脚，也为彼此提供印证。无尽书证把这份「以书为证」的严肃与自由，
                变成一套任何人都能接入的现代评论基础设施。
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { term: "书", note: "文章与记录" },
                  { term: "证", note: "证据与佐证" },
                  { term: "评", note: "边读边评的学术传统" },
                ].map((item) => (
                  <div key={item.term} className="rounded-md border bg-background px-4 py-3">
                    <p className="text-lg font-semibold text-primary">{item.term}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
                <Quote className="h-6 w-6 text-primary/60" />
                <div className="mt-5 space-y-4">
                  <p className="border-l-2 border-primary/50 pl-4 text-base leading-7 text-muted-foreground">
                    案：此篇所引「书证」二字，最早见于汉代章句之学。学者于正文之侧随文取证，
                    后人循其批注，便可复见当时议论与考订之迹。
                  </p>
                  <p className="border-l-2 border-primary/50 pl-4 text-base leading-7 text-muted-foreground">
                    无尽书证沿用此意：每一段评论，都是写在文章旁边的批注，以文字为证，
                    让讨论有出处、有回应、可流传。
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                  <span className="text-sm font-medium">书证 · 仿古人批注</span>
                  <span className="text-xs text-muted-foreground">评注体例</span>
                </div>
              </div>
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
                      description: "使用 GitHub 登录，免费套餐即可创建第一个实例。",
                    },
                    {
                      title: "复制实例地址",
                      description: "在控制台复制 https://instance.waline.infvar.com/{实例标识} 作为服务端地址。",
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
                <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-5 text-xs leading-6">
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
            <div className="rounded-lg bg-card px-6 py-14 text-center shadow-sm sm:px-12">
              <h2 className="text-3xl font-semibold tracking-tight">
                现在就把评论迁移到无尽书证
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                免费创建实例，完成 PoW 验证后立即获得专属 API 地址。
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  免费开始
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-5 text-sm font-medium hover:bg-accent"
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
