import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/lib/env";

function deriveKey(): Buffer {
  const secret = env("APP_ENCRYPTION_KEY");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const blob = Buffer.from(value, "base64url");
    if (blob.length < 28) return null;
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const data = blob.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashIp(ip: string): string {
  return sha256(`ip:${env("APP_ENCRYPTION_KEY")}:${ip}`);
}

export function secureCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function signState(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", env("SESSION_SECRET"))
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyState<T extends Record<string, unknown>>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const expected = createHmac("sha256", env("SESSION_SECRET"))
    .update(parts[0])
    .digest("base64url");
  if (!secureCompare(expected, parts[1])) return null;
  try {
    return JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
