import { prisma } from "@/lib/prisma";
import { renderCommentMarkdown } from "@/lib/waline/markdown";
import type { ModerationInput } from "@/lib/moderation/types";

export interface SensitiveMatch {
  blocked: boolean;
  review: boolean;
  reason?: string;
  rendered?: string;
}

export async function checkSensitiveWords(
  instanceId: string,
  mode: "block" | "replace" | "review",
  input: ModerationInput,
): Promise<SensitiveMatch> {
  const words = await prisma.sensitiveWord.findMany({
    where: {
      enabled: true,
      OR: [{ scope: "global" }, { scope: "instance", instanceId }],
    },
  });
  const text = `${input.content}\n${input.nick}`;
  for (const word of words) {
    if (!text.toLocaleLowerCase().includes(word.word.toLocaleLowerCase())) continue;
    if (word.action === "block" || mode === "block") {
      return { blocked: true, review: false, reason: `评论包含敏感词“${word.word}”。` };
    }
    if (word.action === "review" || mode === "review") {
      return { blocked: false, review: true, reason: `命中敏感词“${word.word}”，等待审核。` };
    }
    const replacement = word.replacement || "***";
    const replaced = input.content.replace(
      new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      replacement,
    );
    return {
      blocked: false,
      review: false,
      rendered: renderCommentMarkdown(replaced),
    };
  }
  return { blocked: false, review: false };
}
