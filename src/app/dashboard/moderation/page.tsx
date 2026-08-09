import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  ModerationManager,
  type ModerationData,
} from "@/components/dashboard/moderation-manager";

export const metadata: Metadata = {
  title: "审核",
};

export default async function ModerationPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const instances = await prisma.instance.findMany({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, slug: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  let initial: ModerationData | null = null;
  if (instances[0]) {
    const [instance, sensitiveWords, moderationRules] = await Promise.all([
      prisma.instance.findUniqueOrThrow({ where: { id: instances[0].id } }),
      prisma.sensitiveWord.findMany({
        where: { instanceId: instances[0].id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.moderationRule.findMany({
        where: { instanceId: instances[0].id },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    initial = {
      instance: {
        id: instance.id,
        slug: instance.slug,
        name: instance.name,
        moderationEnabled: instance.moderationEnabled,
        sensitiveWordMode: instance.sensitiveWordMode,
        defaultCommentStatus: instance.defaultCommentStatus,
        akismetEnabled: instance.akismetEnabled,
        akismetConfigured: Boolean(
          instance.akismetKeyEncrypted || env("AKISMET_API_KEY"),
        ),
        aiModerationEnabled: instance.aiModerationEnabled,
        aiApiBaseUrl: instance.aiApiBaseUrl,
        aiModel: instance.aiModel,
        aiConfigured: Boolean(
          instance.aiApiKeyEncrypted || env("AI_MODERATION_API_KEY"),
        ),
        allowAnonymous: instance.allowAnonymous,
        requireCap: instance.requireCap,
      },
      sensitiveWords: sensitiveWords.map((item) => ({
        id: item.id,
        word: item.word,
        action: item.action,
        replacement: item.replacement,
        createdAt: item.createdAt.toISOString(),
      })),
      moderationRules: moderationRules.map((item) => ({
        id: item.id,
        type: item.type,
        value: item.value,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  return <ModerationManager instances={instances} initial={initial} />;
}
