import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { dashboardStats, listDashboardComments } from "@/lib/dashboard";
import { planLimits } from "@/lib/plans";
import { formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareWarning, Sparkles, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "概览",
};

export default async function DashboardOverviewPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [stats, recent] = await Promise.all([
    dashboardStats(user),
    listDashboardComments(user, { page: 1, pageSize: 8 }),
  ]);
  const limits = planLimits(user.plan);

  const cards = [
    {
      label: "评论实例",
      value: stats.instances,
      hint: `最多 ${limits.instances} 个`,
      icon: Users,
    },
    {
      label: "累计评论",
      value: stats.comments,
      hint: `本月 ${formatNumber(stats.monthlyComments)}`,
      icon: MessageSquareWarning,
    },
    {
      label: "待审核",
      value: stats.moderation.waiting,
      hint: `${formatNumber(stats.moderation.spam)} 条已标记垃圾`,
      icon: Sparkles,
    },
    {
      label: "已发布",
      value: stats.moderation.approved,
      hint: `本月额度 ${formatNumber(limits.monthlyComments)}`,
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">概览</h1>
          <p className="text-sm text-muted-foreground">
            {user.name || user.email || "欢迎回来"}，当前套餐为 {limits.name}。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{limits.name}</Badge>
          <Link
            href="/dashboard/instances"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            新建实例
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatNumber(card.value)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近评论</CardTitle>
          <Link href="/dashboard/comments" className="text-sm font-medium text-primary hover:underline">
            查看全部
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent.data.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              还没有评论。创建实例后，接入评论即可在这里看到动态。
            </div>
          ) : (
            <div className="divide-y">
              {recent.data.map((comment) => (
                <div
                  key={comment.objectId}
                  className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{comment.nick}</span>
                      <Badge
                        variant={
                          comment.status === "approved"
                            ? "success"
                            : comment.status === "spam"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {comment.status === "approved"
                          ? "已发布"
                          : comment.status === "spam"
                            ? "垃圾"
                            : "待审核"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {comment.comment}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {comment.instance.slug} · {formatDate(comment.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
