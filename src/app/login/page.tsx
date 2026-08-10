import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthOAuthPanel } from "@/components/auth-oauth-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "登录",
  description: "登录无尽书证，管理你的评论实例。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  const redirectTo = params.redirect || "/dashboard";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-lg font-semibold">
            无尽书证
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">登录你的控制台</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            使用 GitHub 账号继续，新账号会自动创建。
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>选择登录方式</CardTitle>
            <CardDescription>
              登录前需要完成一次免图片安全验证。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthOAuthPanel mode="login" redirect={redirectTo} />
          </CardContent>
        </Card>
        {params.error === "age" ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
            GitHub 账号注册未满一个月，暂无法登录。
          </p>
        ) : params.error ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
            登录失败，请重新尝试。
          </p>
        ) : null}
      </div>
    </main>
  );
}
