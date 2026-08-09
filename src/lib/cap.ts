import { createHash } from "node:crypto";
import { generateChallenge, validateChallenge } from "capjs-core";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { CAP_SCOPES, type CapScope } from "@/lib/cap-shared";

export { CAP_SCOPES, type CapScope };

export async function createCapChallenge(scope: CapScope, difficulty = 4) {
  const secret = env("CAP_SECRET");
  const instrumentation =
    env("CAP_INSTRUMENTATION", "false") === "true"
      ? {
          blockAutomatedBrowsers: false,
          obfuscationLevel: 1,
        }
      : false;
  return generateChallenge(secret, {
    scope,
    challengeDifficulty: difficulty,
    challengeCount: 50,
    expiresMs: 10 * 60 * 1000,
    instrumentation,
  });
}

export async function redeemCap(
  body: { token?: string; solutions?: unknown; instr?: unknown },
  scope: CapScope,
) {
  if (!body.token || !Array.isArray(body.solutions)) {
    return { success: false as const, reason: "invalid_cap" };
  }
  const secret = env("CAP_SECRET");
  const result = await validateChallenge(
    secret,
    {
      token: body.token,
      solutions: body.solutions as number[],
      instr: body.instr as { i: string; state: Record<string, number>; ts?: number },
    },
    {
      scope: scope as string,
      consumeNonce: async (sig, ttlMs) => {
        try {
          await prisma.capNonce.create({
            data: { sig, expiresAt: new Date(Date.now() + ttlMs) },
          });
          return true;
        } catch (error) {
          if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
            return false;
          }
          throw error;
        }
      },
    },
  );

  if (!result.success) {
    return { success: false as const, reason: result.reason };
  }
  if (!result.tokenKey) {
    return { success: false as const, reason: "invalid_redeem" };
  }
  const tokenKey = result.tokenKey;

  await prisma.capRedemption.create({
    data: {
      tokenKey,
      scope: result.scope ?? scope,
      expiresAt: new Date(result.expires),
    },
  });

  return {
    success: true as const,
    token: result.token,
    expires: result.expires,
  };
}

export async function verifyCapToken(
  token: string | null | undefined,
  scope?: CapScope,
): Promise<boolean> {
  if (!token || !token.includes(":")) return false;
  const [id, secret] = token.split(":");
  if (!id || !secret) return false;
  const tokenKey = `${id}:${createHash("sha256").update(secret).digest("hex")}`;
  const redemption = await prisma.capRedemption.findUnique({
    where: { tokenKey },
  });
  if (!redemption || redemption.expiresAt < new Date() || redemption.consumedAt) return false;
  if (scope && redemption.scope !== scope) return false;
  const consumed = await prisma.capRedemption.updateMany({
    where: { id: redemption.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return consumed.count === 1;
}

export async function verifyOptionalCap(body: {
  capToken?: string;
  capSolutions?: unknown;
}): Promise<{ success: boolean; reason?: string }> {
  if (body.capToken) {
    const ok = await verifyCapToken(body.capToken, "comment");
    return ok ? { success: true } : { success: false, reason: "invalid_cap" };
  }
  return { success: true };
}
