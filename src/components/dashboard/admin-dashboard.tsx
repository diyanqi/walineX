"use client";

import * as React from "react";
import {
  BadgeCheck,
  Banknote,
  Boxes,
  CreditCard,
  KeyRound,
  Loader2,
  MessageSquareText,
  MessagesSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PLANS } from "@/lib/plans";
import { formatDate, formatNumber } from "@/lib/utils";
import type { AdminDashboardData } from "@/lib/admin-stats";

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-primary" />
      </CardContent>
    </Card>
  );
}

function planBadge(plan: string) {
  if (plan === "pro") return <Badge variant="success">专业版</Badge>;
  if (plan === "starter") return <Badge variant="warning">起步版</Badge>;
  return <Badge variant="secondary">免费版</Badge>;
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const [keyword, setKeyword] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState("all");
  const filteredUsers = React.useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return data.users.filter((user) => {
      if (planFilter !== "all" && user.plan !== planFilter) return false;
      if (!term) return true;
      return [user.name, user.email, user.id]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [data.users, keyword, planFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">全站数据</h1>
          <p className="text-sm text-muted-foreground">用户、实例、评论、订单与套餐使用情况总览。</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="用户总数" value={formatNumber(data.stats.users)} icon={Users} />
        <StatCard label="实例总数" value={formatNumber(data.stats.instances)} icon={Boxes} />
        <StatCard label="评论总数" value={formatNumber(data.stats.comments)} icon={MessagesSquare} />
        <StatCard label="本月评论" value={formatNumber(data.stats.monthlyComments)} icon={MessageSquareText} />
        <StatCard label="待审核" value={formatNumber(data.stats.waiting)} icon={Loader2} />
        <StatCard label="垃圾评论" value={formatNumber(data.stats.spam)} icon={ShieldCheck} />
        <StatCard label="有效订阅" value={formatNumber(data.stats.activeSubscriptions)} icon={BadgeCheck} />
        <StatCard label="支付订单" value={formatNumber(data.stats.paidOrders)} icon={CreditCard} />
        <StatCard
          label="累计支付金额"
          value={`¥${formatNumber(data.stats.paidRevenue)}`}
          icon={Banknote}
        />
        <StatCard label="兑换码已用" value={formatNumber(data.stats.redeemUsed)} icon={KeyRound} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>用户数据</CardTitle>
            <CardDescription>
              共 {data.users.length} 位用户，重点展示套餐、用量与付费情况。
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="sm:w-56"
              placeholder="搜索昵称、邮箱或用户 ID"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部套餐</SelectItem>
                <SelectItem value="free">免费版</SelectItem>
                <SelectItem value="starter">起步版</SelectItem>
                <SelectItem value="pro">专业版</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">没有匹配的用户</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">用户</th>
                    <th className="px-4 py-2.5 font-medium">套餐</th>
                    <th className="px-4 py-2.5 font-medium">套餐状态</th>
                    <th className="px-4 py-2.5 font-medium">实例</th>
                    <th className="px-4 py-2.5 font-medium">评论</th>
                    <th className="px-4 py-2.5 font-medium">本月用量</th>
                    <th className="px-4 py-2.5 font-medium">累计用量</th>
                    <th className="px-4 py-2.5 font-medium">已支付</th>
                    <th className="px-4 py-2.5 font-medium">兑换</th>
                    <th className="px-4 py-2.5 font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => {
                    const monthlyLimit = PLANS[user.plan].monthlyComments;
                    const totalLimit = PLANS[user.plan].totalComments;
                    return (
                      <tr key={user.id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              {user.avatar ? <AvatarImage src={user.avatar} alt={user.name || ""} /> : null}
                              <AvatarFallback className="text-[10px]">
                                {(user.name || user.email || "用").slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {user.name || "未设置昵称"}
                                {user.isAdmin ? (
                                  <ShieldCheck className="ml-1 inline h-3.5 w-3.5 text-primary" />
                                ) : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{user.email || user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{planBadge(user.plan)}</td>
                        <td className="px-4 py-3">
                          {user.plan === "free" ? (
                            <span className="text-xs text-muted-foreground">免费套餐</span>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge variant={user.planActive ? "success" : "destructive"}>
                                {user.planActive ? "生效中" : "已过期"}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {user.planExpiresAt ? formatDate(user.planExpiresAt) : "无到期时间"}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{user.instances}</td>
                        <td className="px-4 py-3 tabular-nums">{user.comments}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatNumber(user.monthlyComments)} / {formatNumber(monthlyLimit)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatNumber(user.totalComments)} / {formatNumber(totalLimit)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          ¥{formatNumber(user.paidAmount)}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {user.paidOrderCount} 单
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{user.redeemUsed}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>实例数据</CardTitle>
          <CardDescription>全部实例的评论、待审与额度使用情况。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.instances.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">还没有实例</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">实例</th>
                    <th className="px-4 py-2.5 font-medium">所有者</th>
                    <th className="px-4 py-2.5 font-medium">状态</th>
                    <th className="px-4 py-2.5 font-medium">评论</th>
                    <th className="px-4 py-2.5 font-medium">待审 / 垃圾</th>
                    <th className="px-4 py-2.5 font-medium">本月用量</th>
                    <th className="px-4 py-2.5 font-medium">累计额度</th>
                    <th className="px-4 py-2.5 font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.instances.map((instance) => (
                    <tr key={instance.id} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="font-medium">{instance.name}</p>
                        <p className="text-xs text-muted-foreground">/{instance.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium">{instance.ownerName || "未设置昵称"}</p>
                        <p className="text-muted-foreground">{instance.ownerEmail || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            instance.status === "active"
                              ? "success"
                              : instance.status === "suspended"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {instance.status === "active"
                            ? "正常"
                            : instance.status === "suspended"
                              ? "已停用"
                              : "已禁用"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{instance.comments}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {instance.waiting} / {instance.spam}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatNumber(instance.monthlyComments)} / {formatNumber(instance.monthlyLimit)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatNumber(instance.totalLimit)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(instance.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近支付订单</CardTitle>
          <CardDescription>最近 50 笔订单，覆盖全部用户。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.orders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">还没有支付订单</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">用户</th>
                    <th className="px-4 py-2.5 font-medium">套餐</th>
                    <th className="px-4 py-2.5 font-medium">周期</th>
                    <th className="px-4 py-2.5 font-medium">金额</th>
                    <th className="px-4 py-2.5 font-medium">渠道</th>
                    <th className="px-4 py-2.5 font-medium">状态</th>
                    <th className="px-4 py-2.5 font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.orders.map((order) => (
                    <tr key={order.id} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="font-medium">{order.userName || "未设置昵称"}</p>
                        <p className="text-xs text-muted-foreground">{order.userEmail || "-"}</p>
                      </td>
                      <td className="px-4 py-3">{planBadge(order.plan)}</td>
                      <td className="px-4 py-3 text-xs">{order.period === "year" ? "年付" : "月付"}</td>
                      <td className="px-4 py-3 tabular-nums">¥{formatNumber(order.amount)}</td>
                      <td className="px-4 py-3 text-xs">
                        {order.provider === "epay" ? "易支付" : order.provider}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            order.status === "paid"
                              ? "success"
                              : order.status === "failed" || order.status === "refunded"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {order.status === "paid"
                            ? "已支付"
                            : order.status === "pending"
                              ? "待支付"
                              : order.status === "failed"
                                ? "失败"
                                : order.status === "refunded"
                                  ? "已退款"
                                  : "已过期"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
