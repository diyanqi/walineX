import type { Metadata } from "next";
import Link from "next/link";
import { AuthOAuthPanel } from "@/components/auth-oauth-panel";
import { TenantLoginComplete } from "@/components/tenant/tenant-login-complete";
import { getSessionUser, issueWalineToken } from "@/lib/auth";
import { rootUrl } from "@/lib/env";
import { getInstanceBySlug } from "@/lib/instances";

export const metadata: Metadata = {
  title: "登录评论实例",
  description: "登录无尽书证评论实例。",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TenantLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lng?: string | string[]; redirect?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const redirect = first(query.redirect);
  const lng = first(query.lng);
  const instance = await getInstanceBySlug(slug);

  if (!instance || instance.deletedAt || instance.status !== "active") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">评论实例不可用</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            该实例不存在或已停用，请联系实例管理员。
          </p>
        </div>
      </main>
    );
  }

  const user = await getSessionUser();
  if (user) {
    const token = await issueWalineToken(user.id, slug);
    const objectId = Number(user.id.replace(/\D/g, "").slice(0, 9)) || 0;
    return (
      <TenantLoginComplete
        user={{
          display_name: user.name || user.email || "用户",
          email: user.email || "",
          url: "",
          avatar: user.avatar || "",
          objectId,
          type: instance.userId === user.id ? "administrator" : "guest",
          token,
        }}
        redirect={redirect}
      />
    );
  }

  const authQuery = new URLSearchParams();
  if (redirect) authQuery.set("redirect", redirect);
  if (lng) authQuery.set("lng", lng);
  const authRedirect = `/tenant/${slug}/ui/login${authQuery.size ? `?${authQuery}` : ""}`;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href={rootUrl("/")} className="text-lg font-semibold">
            无尽书证
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">登录 {instance.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            使用 GitHub 或 Google 账号登录后即可在评论中使用你的身份。
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <AuthOAuthPanel mode="login" redirect={authRedirect} />
        </div>
      </div>
    </main>
  );
}
