import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { dashboardStats } from "@/lib/dashboard";
import { planLimits } from "@/lib/plans";
import { formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, GitBranch, Globe, LogOut, ShieldCheck, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "设置",
};

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [accounts, stats] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    dashboardStats(user),
  ]);
  const limits = planLimits(user.plan);

  const features = [
    { label: "评论实例", value: `${limits.instances} 个` },
    { label: "每月评论额度", value: formatNumber(limits.monthlyComments) },
    { label: "累计评论额度", value: formatNumber(limits.totalComments) },
    { label: "AI 审核", enabled: limits.aiModeration },
    { label: "Akismet 垃圾过滤", enabled: limits.akismet },
    { label: "邮件通知", enabled: limits.emailNotifications },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">账号设置</h1>
        <p className="text-sm text-muted-foreground">管理个人资料、登录方式和套餐信息。</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>当前账号的基本信息和注册时间。</CardDescription>
          </CardHeader>
          <CardContent className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              {user.avatar ? <AvatarImage src={user.avatar} alt={user.name || "用户"} /> : null}
              <AvatarFallback className="text-lg">
                {(user.name || user.email || "用").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{user.name || "未设置昵称"}</p>
                <Badge variant="secondary">{limits.name}</Badge>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {user.email || "未绑定邮箱"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                注册于 {formatDate(user.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前套餐</CardTitle>
            <CardDescription>套餐决定实例数量、评论额度和高级审核能力。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{feature.label}</span>
                  {typeof feature.enabled === "boolean" ? (
                    feature.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )
                  ) : (
                    <span className="font-medium">{feature.value}</span>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/pricing"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              查看套餐
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>登录方式</CardTitle>
          <CardDescription>已关联的第三方账号，可直接用于下次登录。</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              暂无关联账号
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 px-4 py-3">
                  {account.provider === "github" ? (
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {account.provider === "github" ? "GitHub" : "Google"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {account.displayName || account.email || account.providerAccountId}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    关联于 {formatDate(account.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>使用情况</CardTitle>
            <CardDescription>跨实例累计的数据量概览。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "实例", value: stats.instances },
                { label: "评论", value: stats.comments },
                { label: "本月", value: stats.monthlyComments },
                { label: "待审核", value: stats.moderation.waiting },
              ].map((item) => (
                <div key={item.label} className="rounded-md border px-3 py-3 text-center">
                  <p className="text-lg font-semibold tabular-nums">{formatNumber(item.value)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              安全
            </CardTitle>
            <CardDescription>退出当前设备上的登录状态。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/logout" method="post">
              <Button type="submit" variant="outline">
                <LogOut />
                退出登录
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
