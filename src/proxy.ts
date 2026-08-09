import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { instanceDomain } from "@/lib/env";

function requestHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const raw = forwardedHost || hostHeader || request.nextUrl.hostname;
  return raw.split(",")[0].trim().split(":")[0].toLowerCase();
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
