import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionUser, sessionCookieOptions } from "@/lib/auth";
import { exchangeOAuthCode, isSafeOAuthRedirect } from "@/lib/oauth";
import { verifyState } from "@/lib/crypto";
import { clientIp } from "@/lib/ratelimit";
import { rootUrl } from "@/lib/env";

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (provider !== "github" && provider !== "google") {
    return NextResponse.redirect(new URL("/login?error=provider", rootUrl("/")));
  }
  const search = request.nextUrl.searchParams;
  const code = search.get("code");
  const state = search.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=oauth", rootUrl("/")));
  }
  const payload = verifyState<{
    provider: string;
    redirect?: string;
  }>(state);
  if (!payload || payload.provider !== provider) {
    return NextResponse.redirect(new URL("/login?error=state", rootUrl("/")));
  }

  let userId = "";
  let oauthError = false;
  try {
    const profile = await exchangeOAuthCode(provider, code);
    const current = await getSessionUser();
    const account = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
    });

    userId = account?.userId ?? "";
    if (!userId && current) {
      userId = current.id;
    }
    if (!userId && profile.email) {
      const existing = await prisma.user.findUnique({ where: { email: profile.email } });
      if (existing?.id) userId = existing.id;
    }
    if (!userId) {
      const user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar,
          url: profile.url,
          githubId: provider === "github" ? profile.providerAccountId : null,
          googleId: provider === "google" ? profile.providerAccountId : null,
        },
      });
      userId = user.id;
    }

    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
      create: {
        provider,
        providerAccountId: profile.providerAccountId,
        userId,
        displayName: profile.name,
        email: profile.email,
        avatar: profile.avatar,
      },
      update: {
        userId,
        displayName: profile.name,
        email: profile.email,
        avatar: profile.avatar,
      },
    });

    if (provider === "github") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          githubId: profile.providerAccountId,
          name: profile.name || undefined,
          avatar: profile.avatar || undefined,
          url: profile.url || undefined,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleId: profile.providerAccountId,
          name: profile.name || undefined,
          avatar: profile.avatar || undefined,
          url: profile.url || undefined,
        },
      });
    }
  } catch (error) {
    console.error("OAuth callback failed", error);
    oauthError = true;
  }

  if (oauthError) {
    return NextResponse.redirect(new URL("/login?error=oauth", rootUrl("/")));
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=oauth", rootUrl("/")));
  }

  const token = await createSession(userId, {
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
  });
  const store = await cookies();
  store.set(
    "walinex_session",
    token,
    sessionCookieOptions(new URL(rootUrl("/")).hostname),
  );

  const safe = isSafeOAuthRedirect(payload.redirect || "/dashboard");
  return NextResponse.redirect(new URL(safe || "/dashboard", rootUrl("/")));
}
