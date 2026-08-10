import type { Instance } from "@prisma/client";
import { classifierFromInstance } from "@/lib/moderation/ai";
import { checkBlacklistRules } from "@/lib/moderation/rules";
import { checkSensitiveWords } from "@/lib/moderation/sensitive";
import type { ModerationInput, ModerationResult } from "@/lib/moderation/types";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/lib/plans";

export async function moderateComment(
  instance: Instance,
  input: ModerationInput,
): Promise<ModerationResult> {
  const rules = await checkBlacklistRules(instance.id, input);
  if (rules.blocked) {
    return { blocked: true, spam: true, review: false, reason: rules.reason };
  }

  const sensitive = await checkSensitiveWords(instance.id, instance.sensitiveWordMode, input);
  if (sensitive.blocked) {
    return { blocked: true, spam: true, review: false, reason: sensitive.reason };
  }

  const signals: ModerationResult = {
    blocked: false,
    spam: false,
    review: sensitive.review,
    reason: sensitive.reason,
    rendered: sensitive.rendered,
  };

  const owner = await prisma.user.findUnique({
    where: { id: instance.userId },
    select: { plan: true },
  });
  if (instance.aiModerationEnabled && owner && !planLimits(owner.plan).aiModeration) {
    console.warn(
      `[moderation] instance ${instance.id} has AI moderation enabled but its plan has no AI moderation permission`,
    );
  }
  const ai =
    owner && planLimits(owner.plan).aiModeration
      ? classifierFromInstance(instance)
      : null;
  const [aiResult] = await Promise.all([
    ai ? ai.classify(input) : Promise.resolve(null),
  ]);

  let score = 0;
  let reason: string | undefined;
  if (aiResult) {
    score = aiResult.score;
    if (aiResult.spam || aiResult.toxic) {
      signals.spam = true;
      reason = aiResult.reason || reason;
    }
  }

  if (signals.spam) {
    signals.blocked = false;
    signals.review = false;
    signals.reason = reason || "系统判定为垃圾评论";
  }
  if (aiResult) signals.score = score;
  return signals;
}
