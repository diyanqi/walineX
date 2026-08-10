import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentMonth } from "@/lib/usage";

export interface AdminSiteStats {
  users: number;
  instances: number;
  comments: number;
  waiting: number;
  spam: number;
  approved: number;
  monthlyComments: number;
  paidOrders: number;
  paidRevenue: number;
  activeSubscriptions: number;
  redeemCodes: number;
  redeemUsed: number;
}

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  plan: Plan;
  planExpiresAt: string | null;
  planActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  instances: number;
  comments: number;
  monthlyComments: number;
  totalComments: number;
  paidAmount: number;
  paidOrderCount: number;
  redeemUsed: number;
  activeSubscriptions: number;
}

export interface AdminInstanceRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  ownerEmail: string | null;
  ownerName: string | null;
  comments: number;
  waiting: number;
  spam: number;
  monthlyComments: number;
  monthlyLimit: number;
  totalLimit: number;
  createdAt: string;
}

export interface AdminOrderRow {
  id: string;
  userEmail: string | null;
  userName: string | null;
  plan: Plan;
  period: string;
  amount: number;
  provider: string;
  status: string;
  createdAt: string;
}

export interface AdminDashboardData {
  stats: AdminSiteStats;
  users: AdminUserRow[];
  instances: AdminInstanceRow[];
  orders: AdminOrderRow[];
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const month = currentMonth();
  const [users, instanceCount, commentGroups, monthlyUsage, totalUsage, paidGroups, subscriptions, redeem] =
    await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          plan: true,
          planExpiresAt: true,
          isAdmin: true,
          createdAt: true,
        },
      }),
      prisma.instance.count({ where: { deletedAt: null } }),
      prisma.comment.groupBy({
        by: ["instanceId", "status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.usageRecord.groupBy({
        by: ["userId"],
        where: { month },
        _sum: { commentCount: true },
      }),
      prisma.usageRecord.groupBy({
        by: ["userId"],
        _sum: { commentCount: true },
      }),
      prisma.paymentOrder.groupBy({
        by: ["userId"],
        where: { status: "paid" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.subscription.groupBy({
        by: ["userId", "status"],
        _count: { _all: true },
      }),
      prisma.redeemCode.aggregate({
        _count: { _all: true },
        _sum: { usedCount: true },
      }),
    ]);

  const [instances, orders, instancesByUser, redeemUsers, usersCount] =
    await Promise.all([
      prisma.instance.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
          user: { select: { email: true, name: true } },
          usageRecords: { select: { month: true, commentCount: true } },
        },
      }),
      prisma.paymentOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.instance.groupBy({
        by: ["userId"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.redemptionUsage.groupBy({
        by: ["userId"],
        _count: { _all: true },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
    ]);

  const instanceToUser = new Map(instances.map((item) => [item.id, item.userId]));
  const instancesByUserMap = new Map(instancesByUser.map((item) => [item.userId, item._count._all]));
  const commentsByUserMap = new Map<string, number>();
  const commentsByInstanceMap = new Map<string, number>();
  const statusByInstanceMap = new Map<string, { waiting: number; spam: number }>();
  for (const group of commentGroups) {
    const key = group.instanceId;
    commentsByInstanceMap.set(key, (commentsByInstanceMap.get(key) || 0) + group._count._all);
    const userId = instanceToUser.get(key);
    if (userId) {
      commentsByUserMap.set(
        userId,
        (commentsByUserMap.get(userId) || 0) + group._count._all,
      );
    }
    if (group.status === "waiting" || group.status === "spam") {
      const current = statusByInstanceMap.get(key) || { waiting: 0, spam: 0 };
      current[group.status] += group._count._all;
      statusByInstanceMap.set(key, current);
    }
  }

  const monthlyByUser = new Map(monthlyUsage.map((item) => [item.userId, item._sum.commentCount || 0]));
  const totalByUser = new Map(totalUsage.map((item) => [item.userId, item._sum.commentCount || 0]));
  const paidByUser = new Map(
    paidGroups.map((item) => [
      item.userId,
      { amount: item._sum.amount || 0, count: item._count._all },
    ]),
  );
  const activeSubsByUser = new Map(
    subscriptions
      .filter((item) => item.status === "active")
      .map((item) => [item.userId, item._count._all]),
  );
  const redeemByUser = new Map(redeemUsers.map((item) => [item.userId, item._count._all]));

  const now = new Date();
  const userRows: AdminUserRow[] = users.map((user) => {
    const planActive =
      user.plan !== "free" &&
      Boolean(user.planExpiresAt && new Date(user.planExpiresAt) > now);
    const paid = paidByUser.get(user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt?.toISOString() || null,
      planActive,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      instances: instancesByUserMap.get(user.id) || 0,
      comments: commentsByUserMap.get(user.id) || 0,
      monthlyComments: monthlyByUser.get(user.id) || 0,
      totalComments: totalByUser.get(user.id) || 0,
      paidAmount: paid?.amount || 0,
      paidOrderCount: paid?.count || 0,
      redeemUsed: redeemByUser.get(user.id) || 0,
      activeSubscriptions: activeSubsByUser.get(user.id) || 0,
    };
  });

  const instanceRows: AdminInstanceRow[] = instances.map((instance) => {
    const statusCounts = statusByInstanceMap.get(instance.id) || { waiting: 0, spam: 0 };
    const monthly = instance.usageRecords.find((item) => item.month === month)?.commentCount || 0;
    return {
      id: instance.id,
      slug: instance.slug,
      name: instance.name,
      status: instance.status,
      ownerEmail: instance.user.email,
      ownerName: instance.user.name,
      comments: commentsByInstanceMap.get(instance.id) || 0,
      waiting: statusCounts.waiting,
      spam: statusCounts.spam,
      monthlyComments: monthly,
      monthlyLimit: instance.monthlyCommentLimit,
      totalLimit: instance.totalCommentLimit,
      createdAt: instance.createdAt.toISOString(),
    };
  });

  const paidOrderGroups = paidGroups.reduce(
    (acc, item) => ({ amount: acc.amount + (item._sum.amount || 0), count: acc.count + item._count._all }),
    { amount: 0, count: 0 },
  );
  const activeSubscriptionCount = subscriptions
    .filter((item) => item.status === "active")
    .reduce((sum, item) => sum + item._count._all, 0);
  const totalCommentCount = commentGroups.reduce((sum, item) => sum + item._count._all, 0);
  const monthlyCommentCount = monthlyUsage.reduce(
    (sum, item) => sum + (item._sum.commentCount || 0),
    0,
  );

  return {
    stats: {
      users: usersCount,
      instances: instanceCount,
      comments: totalCommentCount,
      waiting: commentGroups
        .filter((item) => item.status === "waiting")
        .reduce((sum, item) => sum + item._count._all, 0),
      spam: commentGroups
        .filter((item) => item.status === "spam")
        .reduce((sum, item) => sum + item._count._all, 0),
      approved: commentGroups
        .filter((item) => item.status === "approved")
        .reduce((sum, item) => sum + item._count._all, 0),
      monthlyComments: monthlyCommentCount,
      paidOrders: paidOrderGroups.count,
      paidRevenue: paidOrderGroups.amount,
      activeSubscriptions: activeSubscriptionCount,
      redeemCodes: redeem._count._all,
      redeemUsed: redeem._sum.usedCount || 0,
    },
    users: userRows,
    instances: instanceRows,
    orders: orders.map((order) => ({
      id: order.id,
      userEmail: order.user.email,
      userName: order.user.name,
      plan: order.plan,
      period: order.period,
      amount: order.amount,
      provider: order.provider,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    })),
  };
}
