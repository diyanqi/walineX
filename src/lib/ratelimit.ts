import { env } from "@/lib/env";
import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();

let redis: import("ioredis").Redis | null = null;
let redisFailed = false;

async function getRedis() {
  if (redisFailed || env("REDIS_ENABLED", "false") !== "true") return null;
  if (redis) return redis;
  const { default: Redis } = await import("ioredis");
  try {
    redis = new Redis(env("REDIS_URL", "redis://localhost:6379"), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      protocol: 2,
    });
    redis.on("error", (error) => {
      console.warn("[redis] connection error:", error instanceof Error ? error.message : error);
    });
    await redis.connect();
    return redis;
  } catch {
    redisFailed = true;
    return null;
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const client = await getRedis();
  if (client) {
    try {
      const bucketKey = `rl:${key}`;
      const current = await client.incr(bucketKey);
      if (current === 1) await client.expire(bucketKey, windowSeconds);
      const ttl = await client.ttl(bucketKey);
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        retryAfter: current > limit ? ttl : undefined,
      };
    } catch {
      // fall through to in-memory limiter
    }
  }

  const now = Date.now();
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: bucket.count > limit ? Math.ceil((bucket.resetAt - now) / 1000) : undefined,
  };
}

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export function requestKey(scope: string, request: NextRequest): string {
  return `${scope}:${clientIp(request)}`;
}
