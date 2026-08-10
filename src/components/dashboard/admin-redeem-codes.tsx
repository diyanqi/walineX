"use client";

import * as React from "react";
import { CheckCircle2, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import { formatDate } from "@/lib/utils";

interface RedeemCodeItem {
  id: string;
  code: string;
  plan: "starter" | "pro";
  durationDays: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export function AdminRedeemCodes({ initialItems = [] }: { initialItems?: RedeemCodeItem[] }) {
  const [items, setItems] = React.useState<RedeemCodeItem[]>(initialItems);
  const [plan, setPlan] = React.useState<"starter" | "pro">("starter");
  const [durationDays, setDurationDays] = React.useState(30);
  const [maxUses, setMaxUses] = React.useState(1);
  const [count, setCount] = React.useState(1);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  async function create() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/redeem-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan,
          durationDays,
          maxUses,
          count,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          code: code.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: RedeemCodeItem[];
      };
      if (!response.ok || !payload.data) {
        setError(payload.errmsg || "创建失败");
        return;
      }
      setItems((current) => [...payload.data!, ...current]);
      setCode("");
      setMessage(`已创建 ${payload.data.length} 个兑换码`);
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/redeem-codes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError("删除失败");
        return;
      }
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("兑换码已删除");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">兑换码管理</h1>
        <p className="text-sm text-muted-foreground">创建可自定义时长的套餐兑换码。</p>
      </div>

      {message ? (
        <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            生成兑换码
          </CardTitle>
          <CardDescription>套餐、时长和可使用次数都可自定义。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="redeem-plan">套餐</Label>
            <Select value={plan} onValueChange={(value) => setPlan(value as "starter" | "pro")}>
              <SelectTrigger id="redeem-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">{PLANS.starter.name}</SelectItem>
                <SelectItem value="pro">{PLANS.pro.name}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="redeem-days">时长（天）</Label>
            <Input
              id="redeem-days"
              type="number"
              min={1}
              max={3650}
              value={durationDays}
              onChange={(event) => setDurationDays(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="redeem-uses">可兑换次数</Label>
            <Input
              id="redeem-uses"
              type="number"
              min={1}
              max={10000}
              value={maxUses}
              onChange={(event) => setMaxUses(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="redeem-count">生成数量</Label>
            <Input
              id="redeem-count"
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="redeem-expires">过期时间（可选）</Label>
            <Input
              id="redeem-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="redeem-code">自定义兑换码（可选）</Label>
            <Input
              id="redeem-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="WALINE-XXXX-XXXX"
              maxLength={64}
            />
          </div>
          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <Button onClick={() => void create()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              生成兑换码
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>兑换码列表</CardTitle>
          <CardDescription>最近创建的 200 个兑换码。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              还没有兑换码
            </p>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                  <code className="rounded border bg-muted/50 px-2 py-1 text-xs font-medium">
                    {item.code}
                  </code>
                  <Badge variant="secondary">{PLANS[item.plan].name}</Badge>
                  <span className="text-xs text-muted-foreground">{item.durationDays} 天</span>
                  <span className="text-xs text-muted-foreground">
                    已用 {item.usedCount}/{item.maxUses}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.expiresAt ? `过期 ${formatDate(item.expiresAt)}` : "永不过期"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    aria-label="删除兑换码"
                    onClick={() => void remove(item.id)}
                    disabled={busy}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
