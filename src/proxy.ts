import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { instanceDomain, rootDomain } from "@/lib/env";

function normalizeHostname(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.split(",")[0].trim().split(":")[0].toLowerCase();
}

function isInternalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function isKnownHostname(hostname: string): boolean {
  return hostname === rootDomain || hostname === instanceDomain;
}

function requestHostname(request: NextRequest): string {
  const host = normalizeHostname(request.headers.get("host"));
  const forwarded = normalizeHostname(request.headers.get("x-forwarded-host"));

  // A proxy may override Host while keeping the original domain in
  // X-Forwarded-Host; prefer that only when both values are known domains.
  if (host && forwarded && host !== forwarded && isKnownHostname(host) && isKnownHostname(forwarded)) {
    return forwarded;
  }

  // Behind a normal reverse proxy the Host header is the public domain.
  if (host && !isInternalHostname(host)) return host;
  return forwarded || host || normalizeHostname(request.nextUrl.hostname) || "";
}

function shouldSkip(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/")
  );
}

export function proxy(request: NextRequest) {
  const hostname = requestHostname(request);
  const pathname = request.nextUrl.pathname;
  if (shouldSkip(pathname)) return NextResponse.next();

  if (hostname === instanceDomain) {
    if (pathname === "/tenant" || pathname.startsWith("/tenant/")) {
      return NextResponse.next();
    }
    const match = pathname.match(/^\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\/.*)?$/);
    if (!match) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/tenant/${match[1]}${match[2] ?? ""}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
