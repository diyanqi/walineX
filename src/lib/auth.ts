import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { User } from "@prisma/client";

const SESSION_COOKIE = "walinex_session";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionSecretKey(): Uint8Array {
  return new TextEncoder().encode(env("SESSION_SECRET"));
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
  return token;
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSessionUser(token);
}

export async function findSessionUser(token: string): Promise<User | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.deletedAt) return null;
  return session.user;
}

export async function destroySession(token?: string): Promise<void> {
  const value = token ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(value), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function issueWalineToken(userId: string, instanceSlug: string): Promise<string> {
  return new SignJWT({ scope: "waline", instance: instanceSlug })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecretKey());
}

export async function verifyWalineToken(
  token: string | null | undefined,
  expectedInstance?: string,
): Promise<{ userId: string; instanceSlug: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    if (payload.scope !== "waline" || !payload.sub || !payload.instance) return null;
    const instanceSlug = String(payload.instance);
    if (expectedInstance && instanceSlug !== expectedInstance) return null;
    return { userId: payload.sub, instanceSlug };
  } catch {
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthorized");
  return user;
}

export function sessionCookieOptions(hostname: string) {
  const root = env("NEXT_PUBLIC_ROOT_DOMAIN");
  const domain =
    hostname === root || hostname.endsWith(`.${root}`) || hostname === "localhost"
      ? hostname === "localhost"
        ? undefined
        : root
      : undefined;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env("NODE_ENV") === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    domain,
  };
}
