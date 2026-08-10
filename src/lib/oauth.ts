import { env, instanceDomain, rootDomain, rootUrl } from "@/lib/env";

export function oauthCallbackUrl(provider: string): string {
  return `${rootUrl("/api/auth")}/${provider}/callback`;
}

export function authorizeUrl(provider: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env("GITHUB_CLIENT_ID"),
    redirect_uri: oauthCallbackUrl(provider),
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeOAuthCode(
  provider: string,
  code: string,
): Promise<{
  providerAccountId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  url: string | null;
  githubCreatedAt: string | null;
}> {
  if (provider !== "github") {
    throw new Error("不支持的登录方式");
  }
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
      created_at?: string;
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
    githubCreatedAt: user.created_at || null,
  };
}

export function isSafeOAuthRedirect(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, rootUrl("/"));
    const allowedHosts = new Set([
      new URL(rootUrl("/")).host,
      rootDomain,
      instanceDomain,
    ]);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (allowedHosts.has(url.host)) return url.toString();
    return null;
  } catch {
    return null;
  }
}
