import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TenantProfileActions } from "@/components/tenant/tenant-profile-actions";
import { verifyWalineToken } from "@/lib/auth";
import { dashboardUrl, rootUrl } from "@/lib/env";
import { getInstanceBySlug } from "@/lib/instances";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "个人资料",
  description: "查看无尽书证评论身份。",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TenantProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const token = first(query.token);
  const instance = await getInstanceBySlug(slug);
  const payload = token ? await verifyWalineToken(token, slug) : null;
  const user = payload ? await prisma.user.findUnique({ where: { id: payload.userId } }) : null;

  if (!instance || instance.deletedAt || instance.status !== "active") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-16">
        <p className="text-sm text-muted-foreground">评论实例不可用。</p>
      </main>
    );
  }

  if (!payload || !user || user.deletedAt) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">登录状态已失效</h1>
          <p className="mt-2 text-sm text-muted-foreground">请重新登录后再查看个人资料。</p>
          <ButtonLink href={`/tenant/${slug}/ui/login`}>重新登录</ButtonLink>
        </div>
      </main>
    );
  }

  const isOwner = instance.userId === user.id;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex items-start gap-4">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar}
              alt={user.name || "用户头像"}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {(user.name || user.email || "用").slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{user.name || user.email}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
            {user.url ? (
              <a
                href={user.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm text-primary hover:underline"
              >
                {user.url}
              </a>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {isOwner ? "实例管理员" : "评论用户"} · ID {user.objectId}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <TenantProfileActions dashboardUrl={isOwner ? dashboardUrl("/") : undefined} />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          需要帮助？<Link href={rootUrl("/docs")} className="hover:underline">阅读文档</Link>
        </p>
      </div>
    </main>
  );
}

function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild className="mt-6">
      <a href={href}>{children}</a>
    </Button>
  );
}
