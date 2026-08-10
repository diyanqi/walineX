import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Globe2, MessageSquareText, TerminalSquare } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "文档",
  description: "了解如何创建实例、接入 Waline 客户端以及调用评论 API。",
};

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted p-5 text-xs leading-6">
      <code>{code}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <p className="text-sm font-semibold">文档</p>
          <div className="mt-4 grid gap-1 text-sm">
            {[
              { href: "#quick-start", label: "快速开始" },
              { href: "#instance", label: "创建实例" },
              { href: "#waline", label: "Waline 接入" },
              { href: "#api", label: "API 概览" },
              { href: "#moderation", label: "审核策略" },
              { href: "#data", label: "数据导入导出" },
              { href: "#compat", label: "兼容 API" },
              { href: "#login", label: "登录弹窗" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        </aside>
        <article className="min-w-0 space-y-12">
          <section id="quick-start">
            <Badge>
              <BookOpenCheck className="h-3 w-3" />
              快速开始
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">接入文档</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              无尽书证提供 Waline 兼容的托管评论服务。注册账号后创建实例，把实例 API
              地址替换到现有 Waline 配置中即可。
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { title: "1. 注册账号", text: "使用 GitHub 完成 OAuth 登录，注册即自动创建账号。" },
                { title: "2. 创建实例", text: "在控制台创建实例，得到 instance.waline.infvar.com/{标识} 地址。" },
                { title: "3. 配置接入网站", text: "在实例编辑页填写自己的博客域名，开启 CORS 防盗链。" },
                { title: "4. 替换 serverURL", text: "在 Waline 客户端中把 serverURL 指向实例地址，客户端会自行请求 /api 接口。" },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border bg-background p-5">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="instance">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Globe2 className="h-5 w-5 text-primary" />
              创建实例
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                登录后进入「实例」页面，点击「新建实例」。完成 PoW 人机验证后填写实例名称，
                系统会自动生成实例标识和专属 API 地址。
              </p>
              <p>
                实例地址格式为 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">https://instance.waline.infvar.com/{'{标识}'}</code>
                。Waline 客户端会自动在实例地址后请求 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/api</code> 评论接口。
              </p>
              <p>
                你可以在实例列表中复制 API 地址、启停实例，或进入实例编辑页配置审核、敏感词和微信通知。
              </p>
              <p>
                在「编辑实例」中填写允许接入的网站地址（每行一个）后，其他网站将无法跨域调用该实例的评论 API。
              </p>
            </div>
          </section>

          <section id="waline">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Waline 接入
            </h2>
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                引入 Waline 客户端时，把 serverURL 设置为实例地址。以下示例使用 Waline
                官方客户端。
              </p>
              <CodeBlock
                code={`<link rel="stylesheet" href="https://unpkg.com/@waline/client@v3/dist/waline.css" />
<div id="comments"></div>
<script type="module">
  import { init } from "https://unpkg.com/@waline/client@v3";

  init({
    el: "#comments",
    serverURL: "https://instance.waline.infvar.com/myblog",
    path: location.pathname,
    lang: "zh-CN",
    dark: "auto"
  });
</script>`}
              />
              <p className="text-sm leading-6 text-muted-foreground">
                如果你的站点使用了 VuePress、VitePress 或 Hexo 的 Waline 插件，只需把
                插件配置里的 serverURL 替换为实例地址，其他配置保持不变。
              </p>
            </div>
          </section>

          <section id="api">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <TerminalSquare className="h-5 w-5 text-primary" />
              API 概览
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>以下接口使用实例地址作为服务端根路径。</p>
              <div className="overflow-hidden rounded-lg border">
                <div className="divide-y">
                  {[
                    ["GET", "/api/comment?path=/post", "获取指定页面的评论列表"],
                    ["POST", "/api/comment", "提交新评论"],
                    ["GET", "/api/comment/:objectId", "获取单条评论"],
                    ["GET", "/api/user?token=...", "获取当前评论用户信息"],
                    ["GET", "/api/article?path=/post", "获取文章评论计数"],
                    ["POST", "/api/token", "使用 Waline Token 换取用户数据"],
                  ].map(([method, path, desc]) => (
                    <div
                      key={path}
                      className="grid gap-2 px-4 py-3 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center"
                    >
                      <Badge
                        variant={method === "GET" ? "secondary" : "success"}
                        className="w-fit"
                      >
                        {method}
                      </Badge>
                      <code className="font-mono text-xs">{path}</code>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p>
                创建评论时需要携带表单数据与可选的人机验证 Token。评论默认进入待审核状态，
                通过审核规则后公开显示。
              </p>
            </div>
          </section>

          <section id="moderation">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <BookOpenCheck className="h-5 w-5 text-primary" />
              审核策略
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                每个实例都可以独立配置基础审核开关、敏感词模式、IP/用户黑名单以及匿名评论与
                PoW 验证策略。付费套餐的 AI 垃圾审核由平台统一配置，实例只需打开开关。
              </p>
              <p>
                敏感词支持「拦截」「替换」「转入待审核」三种动作；黑名单规则支持 IP、用户、
                邮箱、链接与昵称五种维度。AI 审核使用 OpenAI 兼容接口，密钥支持多个并以英文逗号分隔轮询。
              </p>
            </div>
          </section>

          <section id="data">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Globe2 className="h-5 w-5 text-primary" />
              数据导入导出
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                在实例编辑页可以导出当前实例的 Waline 官方 JSON 数据，也可以导入 Waline、
                Twikoo 或 Artalk 导出的 JSON 评论数据。导入会保留原文、状态、时间与回复关系，
                已存在的外键标识会自动跳过。
              </p>
            </div>
          </section>

          <section id="compat">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Globe2 className="h-5 w-5 text-primary" />
              兼容 API
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                主 API 保持 Waline 兼容。实例地址同时提供 Twikoo（action 参数）、Artalk
                （/api/v2）和 Valine（/api/1.1/classes/Comment）的基础评论接口，便于迁移现有站点。
              </p>
            </div>
          </section>

          <section id="login">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Globe2 className="h-5 w-5 text-primary" />
              登录弹窗
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                无尽书证沿用 Waline 的登录弹窗协议：客户端打开{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  /ui/login
                </code>
                ，用户完成 OAuth 登录后弹窗通过 postMessage 返回 userInfo 并自动关闭。
              </p>
              <p>
                Waline 官方客户端无需额外配置即可使用这一流程，第三方客户端也可以按相同
                协议实现自定义登录。
              </p>
            </div>
            <div className="mt-6 rounded-lg border bg-muted/40 px-5 py-4 text-sm">
              更多问题请查看
              <Link href="/pricing" className="ml-1 font-medium text-primary hover:underline">
                定价
              </Link>
              ，或直接
              <Link href="/register" className="ml-1 font-medium text-primary hover:underline">
                注册账号
              </Link>
              开始使用。
            </div>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
