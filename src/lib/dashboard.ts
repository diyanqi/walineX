import type { Instance, Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser } from "@/lib/api";
import { currentMonth } from "@/lib/usage";

export async function requireOwnedInstance(instanceId: string): Promise<Instance> {
  const user = await requireApiUser();
  const instance = await prisma.instance.findFirst({
    where: { id: instanceId, userId: user.id, deletedAt: null },
  });
  if (!instance) throw new ApiError("实例不存在", 404);
  return instance;
}

export async function dashboardStats(user: User) {
  const month = currentMonth();
  const [instances, comments, monthly, waiting, spam, approved] = await Promise.all([
    prisma.instance.count({ where: { userId: user.id, deletedAt: null } }),
    prisma.comment.count({
      where: { instance: { userId: user.id }, deletedAt: null },
    }),
    prisma.usageRecord.aggregate({
      where: { userId: user.id, month },
      _sum: { commentCount: true },
    }),
    prisma.comment.count({
      where: { instance: { userId: user.id }, status: "waiting", deletedAt: null },
    }),
    prisma.comment.count({
      where: { instance: { userId: user.id }, status: "spam", deletedAt: null },
    }),
    prisma.comment.count({
      where: { instance: { userId: user.id }, status: "approved", deletedAt: null },
    }),
  ]);
  return {
    instances,
    comments,
    monthlyComments: monthly._sum.commentCount ?? 0,
    moderation: { waiting, spam, approved },
  };
}

export interface DashboardCommentQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  instanceId?: string;
}

export async function listDashboardComments(
  user: User,
  query: DashboardCommentQuery,
) {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
  const where: Prisma.CommentWhereInput = {
    instance: { userId: user.id },
    deletedAt: null,
    ...(query.status ? { status: query.status as Prisma.CommentWhereInput["status"] } : {}),
    ...(query.instanceId ? { instanceId: query.instanceId } : {}),
    ...(query.keyword
      ? {
          OR: [
            { nick: { contains: query.keyword, mode: "insensitive" } },
            { comment: { contains: query.keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [count, data] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      include: {
        instance: { select: { id: true, slug: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}
