import { decryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import type {
  AIClassifier,
  AIClassifierResult,
  ModerationInput,
} from "@/lib/moderation/types";

export class OpenAICompatibleClassifier implements AIClassifier {
  constructor(
    private options: {
      apiKeys: string[];
      baseUrl: string;
      model: string;
    },
  ) {}

  async classify(input: ModerationInput): Promise<AIClassifierResult | null> {
    const keys = this.options.apiKeys;
    if (keys.length === 0) return null;
    for (let attempt = 0; attempt < keys.length; attempt += 1) {
      const apiKey = keys[keyCursor % keys.length];
      keyCursor += 1;
      try {
        const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: this.options.model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  'You are a comment moderation classifier. Return only JSON like {"spam":false,"toxic":false,"score":0.1,"reason":"optional short reason"}. Score is 0-1 where higher means more likely spam or abuse.',
              },
              {
                role: "user",
                content: [
                  `nick: ${input.nick}`,
                  `email: ${input.mail || ""}`,
                  `url: ${input.link || input.url}`,
                  `ip: ${input.ip}`,
                  `comment: ${input.content}`,
                ].join("\n"),
              },
            ],
          }),
        });
        if (!response.ok) {
          console.warn(
            `[ai-moderation] request failed (HTTP ${response.status}) with key index ${keyCursor - 1}, trying next key`,
          );
          continue;
        }
        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content;
        if (!content) continue;
        const cleaned = content.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned) as AIClassifierResult;
        return {
          spam: Boolean(parsed.spam),
          toxic: Boolean(parsed.toxic),
          score: Math.max(0, Math.min(1, Number(parsed.score) || 0)),
          reason: parsed.reason,
        };
      } catch {
        console.warn(`[ai-moderation] request error with key index ${keyCursor - 1}, trying next key`);
        continue;
      }
    }
    console.error("[ai-moderation] all API keys failed, comment was not AI moderated");
    return null;
  }
}

let keyCursor = 0;

function splitKeys(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function classifierFromInstance(instance: {
  aiModerationEnabled: boolean;
  aiApiBaseUrl: string | null;
  aiApiKeyEncrypted: string | null;
  aiModel: string | null;
}): AIClassifier | null {
  if (!instance.aiModerationEnabled) return null;
  const apiKeys = splitKeys(
    decryptSecret(instance.aiApiKeyEncrypted) || env("AI_MODERATION_API_KEY") || null,
  );
  if (apiKeys.length === 0) {
    console.warn(
      "[ai-moderation] AI moderation is enabled but no API key is configured (AI_MODERATION_API_KEY or instance key)",
    );
    return null;
  }
  return new OpenAICompatibleClassifier({
    apiKeys,
    baseUrl: instance.aiApiBaseUrl || env("AI_MODERATION_BASE_URL"),
    model: instance.aiModel || env("AI_MODERATION_MODEL"),
  });
}
