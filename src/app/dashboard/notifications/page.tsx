import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { planLimits } from "@/lib/plans";
import {
  NotificationsManager,
  type NotificationInstance,
} from "@/components/dashboard/notifications-manager";

export const metadata: Metadata = {
  title: "通知",
};

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const instances = await prisma.instance.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const data: NotificationInstance[] = instances.map((instance) => ({
    id: instance.id,
    slug: instance.slug,
    name: instance.name,
    notifyNewComment: instance.notifyNewComment,
    notifyReply: instance.notifyReply,
    notifyModeration: instance.notifyModeration,
    notificationEmail: instance.notificationEmail,
  }));
  return (
    <NotificationsManager
      instances={data}
      defaultEmail={user.email || ""}
      emailNotificationsEnabled={planLimits(user.plan).emailNotifications}
    />
  );
}
