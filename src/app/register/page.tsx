import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthOAuthPanel } from "@/components/auth-oauth-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "注册",
  description: "注册无尽书证账号并创建你的第一个评论实例。",
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-lg font-semibold">
            无尽书证
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">创建你的账号</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            注册即拥有免费套餐，可创建一个 Waline 兼容实例。
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>使用 OAuth 注册</CardTitle>
            <CardDescription>
              登录后系统会自动完成注册并进入控制台。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthOAuthPanel mode="register" redirect="/dashboard" />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            直接登录
          </Link>
        </p>
      </div>
    </main>
  );
}
