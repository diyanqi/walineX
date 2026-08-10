import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { instanceUrl } from "@/lib/env";
import { env } from "@/lib/env";
import { planLimits } from "@/lib/plans";
import {
  InstanceSettings,
  type InstanceSettingsData,
  type ModerationRuleItem,
  type SensitiveWordItem,
} from "@/components/dashboard/instance-settings";

export const metadata: Metadata = {
  title: "实例设置",
};

export default async function InstanceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard/instances");
  const [instance, sensitiveWords, moderationRules] = await Promise.all([
    prisma.instance.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    }),
    prisma.sensitiveWord.findMany({
      where: { instanceId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.moderationRule.findMany({
      where: { instanceId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!instance) notFound();

  const limits = planLimits(user.plan);
  const data: InstanceSettingsData = {
    id: instance.id,
    slug: instance.slug,
    name: instance.name,
    description: instance.description,
    targetOrigins: instance.targetOrigins,
    status: instance.status,
    url: instanceUrl(instance.slug),
    apiUrl: `${instanceUrl(instance.slug)}/api`,
    moderationEnabled: instance.moderationEnabled,
    sensitiveWordMode: instance.sensitiveWordMode,
    defaultCommentStatus: instance.defaultCommentStatus,
    allowAnonymous: instance.allowAnonymous,
    requireCap: instance.requireCap,
    aiModerationEnabled: instance.aiModerationEnabled,
    aiConfigured: Boolean(
      instance.aiApiKeyEncrypted || env("AI_MODERATION_API_KEY"),
    ),
    aiModerationAllowed: limits.aiModeration,
    notifyNewComment: instance.notifyNewComment,
    notifyReply: instance.notifyReply,
    notifyModeration: instance.notifyModeration,
    wechatNotificationEnabled: instance.wechatNotificationEnabled,
    wechatBound: Boolean(
      instance.wechatBotTokenEncrypted &&
        instance.wechatBaseUrl &&
        instance.wechatUserId,
    ),
    wechatNotificationsAllowed: limits.wechatNotifications,
  };
  const words: SensitiveWordItem[] = sensitiveWords.map((item) => ({
    id: item.id,
    word: item.word,
    action: item.action,
    replacement: item.replacement,
    createdAt: item.createdAt.toISOString(),
  }));
  const rules: ModerationRuleItem[] = moderationRules.map((item) => ({
    id: item.id,
    type: item.type,
    value: item.value,
    createdAt: item.createdAt.toISOString(),
  }));
  return <InstanceSettings initial={data} sensitiveWords={words} moderationRules={rules} />;
}
