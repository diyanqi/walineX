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
      apiKey: string;
      baseUrl: string;
      model: string;
    },
  ) {}

  async classify(input: ModerationInput): Promise<AIClassifierResult | null> {
    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
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
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    try {
      const cleaned = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as AIClassifierResult;
      return {
        spam: Boolean(parsed.spam),
        toxic: Boolean(parsed.toxic),
        score: Math.max(0, Math.min(1, Number(parsed.score) || 0)),
        reason: parsed.reason,
      };
    } catch {
      return null;
    }
  }
}

export function classifierFromInstance(instance: {
  aiModerationEnabled: boolean;
  aiApiBaseUrl: string | null;
  aiApiKeyEncrypted: string | null;
  aiModel: string | null;
}): AIClassifier | null {
  if (!instance.aiModerationEnabled) return null;
  const apiKey =
    decryptSecret(instance.aiApiKeyEncrypted) || env("AI_MODERATION_API_KEY") || null;
  if (!apiKey) return null;
  return new OpenAICompatibleClassifier({
    apiKey,
    baseUrl: instance.aiApiBaseUrl || env("AI_MODERATION_BASE_URL"),
    model: instance.aiModel || env("AI_MODERATION_MODEL"),
  });
}
