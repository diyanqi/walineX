import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dashDomain, instanceDomain, rootDomain } from "@/lib/env";

function shouldSkip(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/cap") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health"
  );
}

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;
  if (shouldSkip(pathname)) return NextResponse.next();

  if (hostname === dashDomain || hostname === `dash.${rootDomain}`) {
    if (pathname.startsWith("/dashboard")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  const isInstanceHost =
    hostname.endsWith(`.${instanceDomain}`) || hostname.endsWith(`.${rootDomain}`);
  if (isInstanceHost && hostname !== dashDomain && hostname !== `dash.${rootDomain}`) {
    const suffix = hostname.endsWith(`.${instanceDomain}`) ? instanceDomain : rootDomain;
    const slug = hostname.slice(0, -(suffix.length + 1));
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = `/tenant/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
