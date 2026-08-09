import { prisma } from "@/lib/prisma";
import type { ModerationInput } from "@/lib/moderation/types";

export async function checkBlacklistRules(instanceId: string, input: ModerationInput) {
  const rules = await prisma.moderationRule.findMany({
    where: { instanceId, enabled: true },
  });
  for (const rule of rules) {
    const value = rule.value.toLocaleLowerCase();
    const haystack = (() => {
      switch (rule.type) {
        case "ip_blacklist":
          return input.ip;
        case "email_blacklist":
          return input.mail || "";
        case "url_blacklist":
          return input.link || input.url;
        case "nick_blacklist":
          return input.nick;
        default:
          return "";
      }
    })().toLocaleLowerCase();
    if (haystack && haystack.includes(value)) {
      return { blocked: true, reason: "提交内容被实例规则拦截。" };
    }
  }
  return { blocked: false };
}
