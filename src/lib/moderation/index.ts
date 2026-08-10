import type { Instance } from "@prisma/client";
import { classifierFromInstance } from "@/lib/moderation/ai";
import { checkBlacklistRules } from "@/lib/moderation/rules";
import { checkSensitiveWords } from "@/lib/moderation/sensitive";
import type { ModerationInput, ModerationResult } from "@/lib/moderation/types";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/lib/plans";
import { env } from "@/lib/env";

export function aiResultIsSpam(
  result: { spam: boolean; toxic: boolean; score: number },
  threshold: number,
): boolean {
  return result.spam || result.toxic || result.score >= threshold;
}

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
  const rawThreshold = Number(instance.aiSpamThreshold ?? env("AI_MODERATION_SPAM_THRESHOLD", "0.6"));
  const spamThreshold = Number.isFinite(rawThreshold) ? rawThreshold : 0.6;

  let score = 0;
  let reason: string | undefined;
  if (aiResult) {
    score = aiResult.score;
    const thresholdHit = score >= spamThreshold;
    if (aiResultIsSpam(aiResult, spamThreshold)) {
      signals.spam = true;
      reason =
        aiResult.reason ||
        (thresholdHit
          ? `AI 分 ${score.toFixed(2)} 达到阈值 ${spamThreshold.toFixed(2)}，自动判为垃圾`
          : undefined);
    }
  }

  if (signals.spam) {
    signals.blocked = false;
    signals.review = false;
    signals.reason = reason || "系统判定为垃圾评论";
  } else if (instance.aiModerationEnabled && !aiResult) {
    signals.reason =
      signals.reason ||
      (owner && !planLimits(owner.plan).aiModeration
        ? "AI 审核未执行（当前套餐无权限）"
        : "AI 审核未执行（未配置 API Key 或请求失败）");
  }
  if (aiResult) signals.score = score;
  return signals;
}
