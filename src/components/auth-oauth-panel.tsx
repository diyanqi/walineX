"use client";

import * as React from "react";
import { GitBranch, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CapWidget } from "@/components/cap-widget";
import type { CapScope } from "@/lib/cap-shared";

type Provider = "github" | "google";

interface AuthOAuthPanelProps {
  mode: "login" | "register";
  redirect?: string;
}

export function AuthOAuthPanel({ mode, redirect = "/dashboard" }: AuthOAuthPanelProps) {
  const [capToken, setCapToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<Provider | null>(null);
  const [error, setError] = React.useState("");

  async function start(provider: Provider) {
    if (!capToken) {
      setError("请先完成人机验证，再继续登录。");
      return;
    }
    setLoading(provider);
    setError("");
    try {
      const response = await fetch(`/api/auth/${provider}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ redirect, capToken }),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: { redirectUrl?: string };
      };
      if (!response.ok || !payload.data?.redirectUrl) {
        setError(payload.errmsg || "登录服务暂不可用，请稍后重试。");
        return;
      }
      window.location.assign(payload.data.redirectUrl);
    } catch {
      setError("网络请求失败，请检查网络后重试。");
    } finally {
      setLoading(null);
    }
  }

  const scope: CapScope = mode === "register" ? "registration" : "login";

  return (
    <div className="space-y-5">
      <CapWidget scope={scope} onToken={setCapToken} />
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={loading !== null}
          onClick={() => void start("github")}
        >
          <GitBranch />
          {loading === "github" ? "正在跳转 GitHub..." : "使用 GitHub 登录"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={loading !== null}
          onClick={() => void start("google")}
        >
          <Globe />
          {loading === "google" ? "正在跳转 Google..." : "使用 Google 登录"}
        </Button>
      </div>
    </div>
  );
}
