import type { NextRequest } from "next/server";
import type { Instance } from "@prisma/client";
import { instanceUrl } from "@/lib/env";

export function normalizeTargetOrigin(value: string): string | null {
  let raw = value.trim();
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    const host = url.hostname.toLowerCase();
    return `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return null;
  }
}

export function parseTargetOrigins(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const origins = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return null;
    const origin = normalizeTargetOrigin(item);
    if (!origin) return null;
    origins.add(origin);
  }
  return [...origins];
}

export function normalizeTargetOrigins(value: unknown): string[] {
  const origins = new Set<string>();
  for (const item of Array.isArray(value) ? value : []) {
    if (typeof item !== "string") continue;
    const origin = normalizeTargetOrigin(item);
    if (origin) origins.add(origin);
  }
  return [...origins];
}

export function requestOrigin(request: NextRequest): string | null {
  const rawOrigin = request.headers.get("origin");
  if (rawOrigin && rawOrigin !== "null") {
    return normalizeTargetOrigin(rawOrigin);
  }
  const referer = request.headers.get("referer");
  if (referer) return normalizeTargetOrigin(referer);
  return null;
}

export function instanceOwnOrigin(): string {
  return new URL(instanceUrl("")).origin;
}

export function instanceCorsDecision(
  instance: Instance,
  request: NextRequest,
): { allowed: boolean; origin: string | null } {
  const targets = instance.targetOrigins ?? [];
  const origin = requestOrigin(request);
  if (targets.length === 0) return { allowed: true, origin };
  if (request.headers.get("origin") === "null") {
    return { allowed: false, origin: null };
  }
  if (!origin) return { allowed: false, origin: null };
  if (targets.includes(origin) || origin === instanceOwnOrigin()) {
    return { allowed: true, origin };
  }
  return { allowed: false, origin };
}

export function instanceCorsHeaders(
  instance: Instance,
  request: NextRequest,
): Record<string, string> {
  const decision = instanceCorsDecision(instance, request);
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, X-Requested-With",
    "access-control-max-age": "86400",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
  };
  if (decision.allowed) {
    headers["access-control-allow-origin"] = decision.origin || "*";
  }
  if (decision.origin) headers.vary = "Origin";
  return headers;
}

export function enforceTenantCors(instance: Instance, request: NextRequest): Response | null {
  const decision = instanceCorsDecision(instance, request);
  if (decision.allowed) return null;
  return Response.json(
    { errno: 403, errmsg: "该网站未接入此评论实例" },
    { status: 403, headers: instanceCorsHeaders(instance, request) },
  );
}

export function tenantOptionsResponse(instance: Instance, request: NextRequest): Response {
  return new Response(null, {
    status: 204,
    headers: instanceCorsHeaders(instance, request),
  });
}
