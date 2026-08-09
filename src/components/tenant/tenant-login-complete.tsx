"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TenantUserInfo {
  display_name: string;
  email: string;
  url: string;
  avatar: string;
  objectId: number;
  type: "administrator" | "guest";
  token: string;
}

interface TenantLoginCompleteProps {
  user: TenantUserInfo;
  redirect?: string;
}

export function TenantLoginComplete({ user, redirect }: TenantLoginCompleteProps) {
  const posted = React.useRef(false);

  React.useEffect(() => {
    if (posted.current) return;
    if (window.opener) {
      posted.current = true;
      window.opener.postMessage({ type: "userInfo", data: user }, "*");
      window.setTimeout(() => window.close(), 120);
      return;
    }
    if (redirect) {
      try {
        const target = new URL(redirect, window.location.origin);
        if (target.protocol === "http:" || target.protocol === "https:") {
          posted.current = true;
          target.searchParams.set("token", user.token);
          window.location.assign(target.toString());
          return;
        }
      } catch {
        // Fall through to the success state when the redirect is invalid.
      }
    }
  }, [redirect, user]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
        <h1 className="text-xl font-semibold">登录成功</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          已以 {user.display_name} 的身份登录，可以关闭此窗口返回评论页。
        </p>
        <Button className="mt-6 w-full" onClick={() => window.close()}>
          关闭窗口
        </Button>
      </div>
    </main>
  );
}
