import type { OAuthProvider } from "@prisma/client";
import { env } from "@/lib/env";
import { rootUrl } from "@/lib/env";

const PROVIDER_NAMES: Record<OAuthProvider, string> = {
  github: "GitHub",
  google: "Google",
};

export function providerName(provider: OAuthProvider): string {
  return PROVIDER_NAMES[provider];
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return `${rootUrl("/api/auth")}/${provider}/callback`;
}

export function authorizeUrl(provider: OAuthProvider, state: string): string {
  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: env("GITHUB_CLIENT_ID"),
      redirect_uri: oauthCallbackUrl(provider),
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: oauthCallbackUrl(provider),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
): Promise<{
  providerAccountId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  url: string | null;
}> {
  if (provider === "github") {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env("GITHUB_CLIENT_ID"),
        client_secret: env("GITHUB_CLIENT_SECRET"),
        code,
        redirect_uri: oauthCallbackUrl(provider),
      }),
    });
    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error_description?: string;
    };
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || "GitHub OAuth 交换失败");
    }
    const headers = {
      authorization: `Bearer ${tokenData.access_token}`,
      accept: "application/vnd.github+json",
      "user-agent": "WalineX",
    };
    const [user, emails] = await Promise.all([
      fetch("https://api.github.com/user", { headers }).then((r) => r.json()) as Promise<{
        id: number;
        name: string | null;
        email: string | null;
        avatar_url?: string;
        blog?: string;
      }>,
      fetch("https://api.github.com/user/emails", { headers }).then((r) => r.json()) as Promise<
        Array<{ email: string; primary: boolean; verified: boolean }>
      >,
    ]);
    const email =
      user.email ||
      emails.find((item) => item.primary && item.verified)?.email ||
      emails[0]?.email ||
      null;
    return {
      providerAccountId: String(user.id),
      name: user.name || email?.split("@")[0] || "GitHub 用户",
      email,
      avatar: user.avatar_url || null,
      url: user.blog || null,
    };
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: oauthCallbackUrl(provider),
      grant_type: "authorization_code",
    }),
  });
  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenData.access_token) {
    throw new Error(tokenData.error_description || "Google OAuth 交换失败");
  }
  const user = (await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${tokenData.access_token}` },
  }).then((r) => r.json())) as {
    id: string;
    name?: string;
    email?: string;
    picture?: string;
    link?: string;
  };
  return {
    providerAccountId: user.id,
    name: user.name || user.email?.split("@")[0] || "Google 用户",
    email: user.email || null,
    avatar: user.picture || null,
    url: user.link || null,
  };
}

export function isSafeOAuthRedirect(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, rootUrl("/"));
    const allowedHosts = new Set([
      new URL(rootUrl("/")).host,
      env("NEXT_PUBLIC_DASH_DOMAIN"),
      env("NEXT_PUBLIC_ROOT_DOMAIN"),
    ]);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname;
    if (
      host === "localhost" ||
      allowedHosts.has(url.host) ||
      host.endsWith(`.${env("NEXT_PUBLIC_INSTANCE_DOMAIN")}`) ||
      host.endsWith(`.${env("NEXT_PUBLIC_ROOT_DOMAIN")}`)
    ) {
      return url.pathname + url.search + url.hash || "/";
    }
    return null;
  } catch {
    return null;
  }
}
