import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { listDashboardComments } from "@/lib/dashboard";
import {
  CommentsManager,
  type DashboardCommentItem,
} from "@/components/dashboard/comments-manager";

export const metadata: Metadata = {
  title: "评论",
};

export default async function CommentsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [instances, initial] = await Promise.all([
    prisma.instance.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, slug: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    listDashboardComments(user, { page: 1, pageSize: 50 }),
  ]);
  const comments: DashboardCommentItem[] = initial.data.map((comment) => ({
    objectId: comment.objectId,
    nick: comment.nick,
    mail: comment.mail,
    comment: comment.comment,
    status: comment.status,
    sticky: comment.sticky,
    url: comment.url,
    createdAt: comment.createdAt.toISOString(),
    instance: {
      id: comment.instance.id,
      slug: comment.instance.slug,
      name: comment.instance.name,
    },
  }));
  return <CommentsManager instances={instances} initialComments={comments} />;
}
