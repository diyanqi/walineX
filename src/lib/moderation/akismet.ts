import { decryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import type { AIClassifierResult, ModerationInput } from "@/lib/moderation/types";

export interface AkismetConfig {
  apiKey: string;
  blog: string;
}

export async function checkAkismet(
  config: AkismetConfig,
  input: ModerationInput,
): Promise<{ spam: boolean; score: number; reason?: string }> {
  const params = new URLSearchParams({
    blog: config.blog,
    user_ip: input.ip,
    user_agent: "waline-x",
    comment_type: input.mail ? "comment" : "trackback",
    comment_author: input.nick,
    comment_author_email: input.mail || "",
    comment_author_url: input.link || "",
    comment_content: input.content,
  });
  const response = await fetch(`https://${config.apiKey}.rest.akismet.com/1.1/comment-check`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": `WalineX/1.0 | Akismet/1.0`,
    },
    body: params,
  });
  const body = await response.text();
  return {
    spam: body.trim() === "true",
    score: body.trim() === "true" ? 0.9 : 0.1,
    reason: body.trim() === "true" ? "Akismet 判定为垃圾评论" : undefined,
  };
}

export function resolveAkismetKey(
  encrypted: string | null | undefined,
): string | null {
  return decryptSecret(encrypted) || env("AKISMET_API_KEY") || null;
}

export function akismetConfigFromInstance(instance: {
  akismetEnabled: boolean;
  akismetKeyEncrypted: string | null;
  url?: string;
}): AkismetConfig | null {
  if (!instance.akismetEnabled) return null;
  const apiKey = resolveAkismetKey(instance.akismetKeyEncrypted);
  if (!apiKey) return null;
  return { apiKey, blog: instance.url || "https://waline.infvar.com" };
}

export async function akismetResult(
  config: AkismetConfig | null,
  input: ModerationInput,
): Promise<AIClassifierResult | null> {
  if (!config) return null;
  const result = await checkAkismet(config, input);
  return {
    spam: result.spam,
    toxic: false,
    score: result.score,
    reason: result.reason,
  };
}
