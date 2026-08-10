"use client";

import * as React from "react";
import {
  ArrowLeft,
  Ban,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Filter,
  Download,
  Loader2,
  Plus,
  QrCode,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Unlink,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export interface InstanceSettingsData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  targetOrigins: string[];
  status: string;
  url: string;
  apiUrl: string;
  moderationEnabled: boolean;
  sensitiveWordMode: "block" | "replace" | "review";
  defaultCommentStatus: "approved" | "waiting" | "spam";
  allowAnonymous: boolean;
  requireCap: boolean;
  commentRateLimitMax: number;
  commentRateLimitWindowSec: number;
  aiModerationEnabled: boolean;
  aiSpamThreshold: number;
  aiConfigured: boolean;
  aiModerationAllowed: boolean;
  notifyNewComment: boolean;
  notifyReply: boolean;
  notifyModeration: boolean;
  wechatNotificationEnabled: boolean;
  wechatBound: boolean;
  wechatNotificationsAllowed: boolean;
}

export interface InstancePatchData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  targetOrigins: string[];
  status: string;
  url: string;
  apiUrl: string;
  notifyNewComment: boolean;
  notifyReply: boolean;
  notifyModeration: boolean;
  wechatNotificationEnabled: boolean;
  wechatBound: boolean;
}

export interface SensitiveWordItem {
  id: string;
  word: string;
  action: "block" | "replace" | "review";
  replacement: string | null;
  createdAt: string;
}

export interface ModerationRuleItem {
  id: string;
  type: string;
  value: string;
  createdAt: string;
}

interface InstanceSettingsProps {
  initial: InstanceSettingsData;
  sensitiveWords: SensitiveWordItem[];
  moderationRules: ModerationRuleItem[];
}

function mergeInstancePatch(
  current: InstanceSettingsData,
  patch: InstancePatchData,
): InstanceSettingsData {
  return {
    ...current,
    id: patch.id,
    slug: patch.slug,
    name: patch.name,
    description: patch.description,
    targetOrigins: patch.targetOrigins,
    status: patch.status,
    url: patch.url,
    apiUrl: patch.apiUrl,
    notifyNewComment: patch.notifyNewComment,
    notifyReply: patch.notifyReply,
    notifyModeration: patch.notifyModeration,
    wechatNotificationEnabled: patch.wechatNotificationEnabled,
    wechatBound: patch.wechatBound,
  };
}

const WORD_ACTION_LABELS: Record<SensitiveWordItem["action"], string> = {
  block: "拦截",
  replace: "替换",
  review: "审核",
};

const WORD_MODE_LABELS = {
  block: "拦截命中内容",
  replace: "替换命中内容",
  review: "转入待审核",
} as const;

const RULE_TYPE_LABELS: Record<string, string> = {
  ip_blacklist: "IP 黑名单",
  user_blacklist: "用户黑名单",
  email_blacklist: "邮箱黑名单",
  url_blacklist: "链接黑名单",
  nick_blacklist: "昵称黑名单",
};

type SettingsTab = "basic" | "review" | "ai" | "words" | "rules" | "data" | "notifications";

const NAV_ITEMS: Array<{ id: SettingsTab; label: string; icon: LucideIcon }> = [
  { id: "basic", label: "基本信息", icon: Settings },
  { id: "review", label: "基础审核", icon: ShieldCheck },
  { id: "ai", label: "AI 审核", icon: BrainCircuit },
  { id: "words", label: "敏感词", icon: Filter },
  { id: "rules", label: "黑名单规则", icon: Ban },
  { id: "data", label: "数据导入导出", icon: Download },
  { id: "notifications", label: "通知设置", icon: Bell },
];

export function InstanceSettings({
  initial,
  sensitiveWords: initialWords,
  moderationRules: initialRules,
}: InstanceSettingsProps) {
  const [data, setData] = React.useState(initial);
  const [form, setForm] = React.useState({
    name: initial.name,
    slug: initial.slug,
    description: initial.description || "",
    targetOrigins: (initial.targetOrigins || []).join("\n"),
  });
  const [rateLimitForm, setRateLimitForm] = React.useState({
    max: initial.commentRateLimitMax,
    windowSec: initial.commentRateLimitWindowSec,
  });
  const [sensitiveWords, setSensitiveWords] = React.useState(initialWords);
  const [moderationRules, setModerationRules] = React.useState(initialRules);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const [word, setWord] = React.useState("");
  const [wordAction, setWordAction] = React.useState<SensitiveWordItem["action"]>("review");
  const [replacement, setReplacement] = React.useState("");
  const [ruleType, setRuleType] = React.useState("ip_blacklist");
  const [ruleValue, setRuleValue] = React.useState("");

  const [qrImg, setQrImg] = React.useState("");
  const [qrPolling, setQrPolling] = React.useState(false);
  const [qrMessage, setQrMessage] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("basic");

  function notify(message: string, isError = false) {
    setMessage(isError ? "" : message);
    setError(isError ? message : "");
  }

  async function saveBasic() {
    if (!form.name.trim()) {
      notify("请输入实例名称", true);
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(form.slug)) {
      notify("实例标识只能包含小写字母、数字和连字符", true);
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug,
          description: form.description.trim(),
          targetOrigins: form.targetOrigins
            .split(/\n/)
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: InstancePatchData;
      };
      if (!response.ok || !payload.data) {
        notify(payload.errmsg || "保存失败，请重试", true);
        return;
      }
      setData((current) => mergeInstancePatch(current, payload.data!));
      notify("基本信息已保存");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function saveModeration(patch: Record<string, unknown>) {
    if (patch.moderationEnabled === false && patch.defaultCommentStatus === undefined) {
      patch = { ...patch, defaultCommentStatus: "approved" };
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/moderation`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as { errno?: number; errmsg?: string };
      if (!response.ok) {
        notify(payload.errmsg || "保存失败", true);
        return;
      }
      setData((current) => ({ ...current, ...(patch as Partial<InstanceSettingsData>) }));
      notify("审核设置已保存");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function saveRateLimit() {
    const max = Math.min(1000, Math.max(1, Number(rateLimitForm.max) || 6));
    const windowSec = Math.min(86400, Math.max(1, Number(rateLimitForm.windowSec) || 60));
    setRateLimitForm({ max, windowSec });
    await saveModeration({ commentRateLimitMax: max, commentRateLimitWindowSec: windowSec });
  }

  async function addWord() {
    if (!word.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/words`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          word: word.trim(),
          action: wordAction,
          replacement: replacement.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: SensitiveWordItem;
      };
      if (!response.ok || !payload.data) {
        notify(payload.errmsg || "添加失败", true);
        return;
      }
      setSensitiveWords((current) => [payload.data!, ...current]);
      setWord("");
      setReplacement("");
      notify("敏感词已添加");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function removeWord(id: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/words/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        notify("删除失败", true);
        return;
      }
      setSensitiveWords((current) => current.filter((item) => item.id !== id));
      notify("敏感词已删除");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function addRule() {
    if (!ruleValue.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/rules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: ruleType, value: ruleValue.trim() }),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: ModerationRuleItem;
      };
      if (!response.ok || !payload.data) {
        notify(payload.errmsg || "添加失败", true);
        return;
      }
      setModerationRules((current) => [payload.data!, ...current]);
      setRuleValue("");
      notify("规则已添加");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(id: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/rules/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        notify("删除失败", true);
        return;
      }
      setModerationRules((current) => current.filter((item) => item.id !== id));
      notify("规则已删除");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function startQr() {
    setSaving(true);
    setQrMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/wechat/qr`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: { qrcode: string; qrcodeImg: string };
      };
      if (!response.ok || !payload.data) {
        notify(payload.errmsg || "二维码获取失败", true);
        return;
      }
      setQrImg(
        `/api/dashboard/instances/${data.id}/wechat/qr-image?qrcode=${encodeURIComponent(payload.data.qrcode)}&img=${encodeURIComponent(payload.data.qrcodeImg)}`,
      );
      setQrPolling(true);
      void pollQr(payload.data.qrcode);
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function pollQr(qrcode: string) {
    try {
      const response = await fetch(
        `/api/dashboard/instances/${data.id}/wechat/status?qrcode=${encodeURIComponent(qrcode)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: { status: string; connected?: boolean };
      };
      if (!response.ok) {
        setQrMessage(payload.errmsg || "二维码状态查询失败");
        setQrPolling(false);
        return;
      }
      if (payload.data?.connected) {
        setQrPolling(false);
        setQrMessage("绑定成功，微信通知已开启");
        setData((current) => ({
          ...current,
          wechatBound: true,
          wechatNotificationEnabled: true,
        }));
        return;
      }
      if (payload.data?.status === "expired") {
        setQrPolling(false);
        setQrMessage("二维码已过期，请重新获取");
        return;
      }
      window.setTimeout(() => void pollQr(qrcode), 1500);
    } catch {
      setQrMessage("二维码状态查询失败");
      setQrPolling(false);
    }
  }

  async function unbindWechat() {
    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/wechat`, {
        method: "DELETE",
      });
      if (!response.ok) {
        notify("解绑失败", true);
        return;
      }
      setData((current) => ({
        ...current,
        wechatBound: false,
        wechatNotificationEnabled: false,
      }));
      setQrImg("");
      setQrMessage("已解绑微信");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotification(patch: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: InstancePatchData;
      };
      if (!response.ok || !payload.data) {
        notify(payload.errmsg || "保存失败", true);
        return;
      }
      setData((current) => mergeInstancePatch(current, payload.data!));
      notify("通知设置已保存");
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    try {
      const response = await fetch(`/api/dashboard/instances/${data.id}/data/export`, {
        cache: "no-store",
      });
      if (!response.ok) {
        notify("导出失败", true);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${data.slug}-waline-export.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify("导出文件已开始下载");
    } catch {
      notify("网络请求失败，请重试", true);
    }
  }

  async function importData(file: File) {
    setImporting(true);
    setMessage("");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/dashboard/instances/${data.id}/data/import`, {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: { imported: number; skipped: number; failed: number; counters?: number };
      };
      if (!response.ok || !payload.data) {
        notify(payload.errmsg || "导入失败", true);
        return;
      }
      notify(
        `导入完成：新增 ${payload.data.imported} 条评论，跳过 ${payload.data.skipped} 条，失败 ${payload.data.failed} 条，浏览量 ${payload.data.counters ?? 0} 条`,
      );
    } catch {
      notify("网络请求失败，请重试", true);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/instances"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="返回实例列表"
          >
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.slug}</p>
          </div>
        </div>
        <Badge variant={data.status === "active" ? "success" : "secondary"}>
          {data.status === "active" ? "运行中" : "已停用"}
        </Badge>
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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-56">
          <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-background p-1 lg:flex-col">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={activeTab === item.id ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 space-y-6">
          <div className={activeTab === "basic" ? "" : "hidden"}>
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
          <CardDescription>实例名称、标识和允许接入的网站。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="settings-name">实例名称</Label>
              <Input
                id="settings-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-slug">实例标识</Label>
              <Input
                id="settings-slug"
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value.toLowerCase() })
                }
                maxLength={63}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settings-description">描述</Label>
            <Textarea
              id="settings-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settings-origins">允许接入的网站</Label>
            <Textarea
              id="settings-origins"
              value={form.targetOrigins}
              onChange={(event) => setForm({ ...form, targetOrigins: event.target.value })}
              rows={4}
              placeholder={"https://example.com\nhttps://blog.example.org"}
            />
            <p className="text-xs text-muted-foreground">
              留空表示不限制来源；填写后会拦截未列入的网站请求。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <code className="truncate rounded border bg-muted/50 px-2 py-1 text-xs">
              {data.apiUrl}
            </code>
            <Button onClick={() => void saveBasic()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              保存基本信息
            </Button>
          </div>
              </CardContent>
            </Card>
          </div>

          <div className={activeTab === "review" ? "" : "hidden"}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  基础审核
                </CardTitle>
                <CardDescription>评论进入站点前的开关、敏感词和黑名单规则。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">启用审核</p>
                <p className="mt-0.5 text-xs text-muted-foreground">关闭后评论直接发布</p>
              </div>
              <Switch
                checked={data.moderationEnabled}
                onCheckedChange={(value) => void saveModeration({ moderationEnabled: value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">匿名评论</p>
                <p className="mt-0.5 text-xs text-muted-foreground">允许未登录访客发表评论</p>
              </div>
              <Switch
                checked={data.allowAnonymous}
                onCheckedChange={(value) => void saveModeration({ allowAnonymous: value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">评论人机验证</p>
                <p className="mt-0.5 text-xs text-muted-foreground">发表评论前完成 PoW 验证</p>
              </div>
              <Switch
                checked={data.requireCap}
                onCheckedChange={(value) => void saveModeration({ requireCap: value })}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 rounded-md border p-4">
              <Label htmlFor="sensitive-mode">敏感词模式</Label>
              <Select
                value={data.sensitiveWordMode}
                onValueChange={(value) =>
                  void saveModeration({
                    sensitiveWordMode: value as "block" | "replace" | "review",
                  })
                }
              >
                <SelectTrigger id="sensitive-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(WORD_MODE_LABELS) as Array<
                      keyof typeof WORD_MODE_LABELS
                    >
                  ).map((key) => (
                    <SelectItem key={key} value={key}>
                      {WORD_MODE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 rounded-md border p-4">
              <Label htmlFor="default-status">新评论默认状态</Label>
              <Select
                value={data.defaultCommentStatus}
                onValueChange={(value) =>
                  void saveModeration({
                    defaultCommentStatus: value as "approved" | "waiting" | "spam",
                  })
                }
              >
                <SelectTrigger id="default-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">待审核</SelectItem>
                  <SelectItem value="approved">直接发布</SelectItem>
                  <SelectItem value="spam">标记垃圾</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 rounded-md border p-4">
              <Label htmlFor="rate-limit-max">单 IP 评论频率限制</Label>
              <p className="text-xs text-muted-foreground">
                同一 IP 在时间窗口内最多发表的评论数。
              </p>
              <Input
                id="rate-limit-max"
                type="number"
                min={1}
                max={1000}
                value={rateLimitForm.max}
                onChange={(event) =>
                  setRateLimitForm((current) => ({
                    ...current,
                    max: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 rounded-md border p-4">
              <Label htmlFor="rate-limit-window">时间窗口（秒）</Label>
              <p className="text-xs text-muted-foreground">
                频率限制的时间窗口，默认 60 秒。
              </p>
              <Input
                id="rate-limit-window"
                type="number"
                min={1}
                max={86400}
                value={rateLimitForm.windowSec}
                onChange={(event) =>
                  setRateLimitForm((current) => ({
                    ...current,
                    windowSec: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => void saveRateLimit()}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              保存频率限制
            </Button>
          </div>
              </CardContent>
            </Card>
          </div>

          {data.aiModerationAllowed ? (
            <div className={activeTab === "ai" ? "" : "hidden"}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    垃圾与 AI 审核
                  </CardTitle>
                  <CardDescription>
                    {data.aiConfigured
                      ? "平台已配置 AI 审核，只需打开开关。"
                      : "平台尚未配置 AI 审核，请联系管理员。"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">AI 垃圾审核</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  自动识别垃圾与不当内容，命中后进入垃圾状态。
                </p>
              </div>
              <Switch
                checked={data.aiModerationEnabled}
                disabled={!data.aiConfigured}
                onCheckedChange={(value) => void saveModeration({ aiModerationEnabled: value })}
              />
            </div>
            <div className="grid gap-2 rounded-md border p-4">
              <Label htmlFor="ai-spam-threshold">AI 垃圾判定阈值</Label>
              <Input
                id="ai-spam-threshold"
                type="number"
                min={0}
                max={1}
                step={0.05}
                defaultValue={data.aiSpamThreshold}
                disabled={!data.aiConfigured}
                onBlur={(event) => {
                  const parsed = Number(event.target.value);
                  const value = Number.isFinite(parsed)
                    ? Math.min(1, Math.max(0, parsed))
                    : 0.6;
                  void saveModeration({ aiSpamThreshold: value });
                }}
              />
              <p className="text-xs text-muted-foreground">
                AI 分达到或超过该值时自动判为垃圾。
              </p>
            </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className={activeTab === "words" ? "" : "hidden"}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  敏感词
                </CardTitle>
                <CardDescription>添加自定义敏感词，支持拦截、替换或转入审核。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto]">
            <Input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="敏感词"
              maxLength={100}
            />
            <Select
              value={wordAction}
              onValueChange={(value) =>
                setWordAction(value as SensitiveWordItem["action"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(WORD_ACTION_LABELS) as Array<SensitiveWordItem["action"]>).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {WORD_ACTION_LABELS[key]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Input
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
              placeholder="替换为（可选）"
              maxLength={50}
              disabled={wordAction !== "replace"}
            />
            <Button onClick={() => void addWord()} disabled={saving || !word.trim()}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              添加
            </Button>
          </div>
          {sensitiveWords.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              暂无自定义敏感词
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {sensitiveWords.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate font-medium">{item.word}</span>
                  <Badge
                    variant={
                      item.action === "block"
                        ? "destructive"
                        : item.action === "replace"
                          ? "success"
                          : "warning"
                    }
                  >
                    {WORD_ACTION_LABELS[item.action]}
                  </Badge>
                  {item.action === "replace" && item.replacement ? (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      替换为 {item.replacement}
                    </span>
                  ) : null}
                  <span className="hidden text-xs text-muted-foreground lg:inline">
                    {formatDate(item.createdAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="删除敏感词"
                    onClick={() => void removeWord(item.id)}
                    disabled={saving}
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

            <div className={activeTab === "rules" ? "" : "hidden"}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    黑名单规则
                  </CardTitle>
                  <CardDescription>按 IP、用户、邮箱、链接或昵称拦截可疑评论者。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
            <Select value={ruleType} onValueChange={setRuleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={ruleValue}
              onChange={(event) => setRuleValue(event.target.value)}
              placeholder="输入规则值，例如 IP 地址或邮箱"
              maxLength={200}
            />
            <Button onClick={() => void addRule()} disabled={saving || !ruleValue.trim()}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              添加
            </Button>
          </div>
          {moderationRules.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              暂无黑名单规则
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {moderationRules.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <Badge variant="secondary" className="shrink-0">
                    {RULE_TYPE_LABELS[item.type] || item.type}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {item.value}
                  </span>
                  <span className="hidden text-xs text-muted-foreground lg:inline">
                    {formatDate(item.createdAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="删除规则"
                    onClick={() => void removeRule(item.id)}
                    disabled={saving}
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

            <div className={activeTab === "data" ? "" : "hidden"}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" />
                    数据导入导出
                  </CardTitle>
                  <CardDescription>使用 Waline 官方 JSON 格式迁移评论、浏览量和回复关系。</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => void exportData()} disabled={saving}>
            <Download />
            导出 JSON
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload />}
            导入 JSON
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              disabled={importing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importData(file);
                event.target.value = "";
              }}
            />
          </label>
        </CardContent>
              </Card>
            </div>

            <div className={activeTab === "notifications" ? "" : "hidden"}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    通知设置
                  </CardTitle>
                  <CardDescription>每个实例独立绑定微信，事件直接推送到微信。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
          {!data.wechatNotificationsAllowed ? (
            <div className="rounded-md border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              当前免费套餐不包含微信通知，升级套餐后即可扫码绑定。
            </div>
          ) : !data.wechatBound ? (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-md border p-6 text-center">
                <QrCode className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-medium">扫码绑定微信</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  绑定后即可接收新评论、回复和待审核通知。
                </p>
                <Button className="mt-4" onClick={() => void startQr()} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <QrCode />}
                  获取二维码
                </Button>
              </div>
              {qrImg ? (
                <div className="flex flex-col items-center justify-center rounded-md border p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImg}
                    alt="微信绑定二维码"
                    className="h-52 w-52 object-contain"
                  />
                  {qrPolling ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      等待扫码确认...
                    </p>
                  ) : null}
                  {qrMessage ? (
                    <p className="mt-3 text-sm text-muted-foreground">{qrMessage}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-medium">微信已绑定</p>
                </div>
                <Button variant="outline" onClick={() => void unbindWechat()} disabled={saving}>
                  <Unlink />
                  解绑微信
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">新评论通知</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">有新评论进入实例时发送</p>
                  </div>
                  <Switch
                    checked={data.notifyNewComment}
                    onCheckedChange={(value) =>
                      void saveNotification({ notifyNewComment: value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">回复通知</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">评论被回复时通知站点</p>
                  </div>
                  <Switch
                    checked={data.notifyReply}
                    onCheckedChange={(value) => void saveNotification({ notifyReply: value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">待审核通知</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">评论进入待审核状态时发送</p>
                  </div>
                  <Switch
                    checked={data.notifyModeration}
                    onCheckedChange={(value) =>
                      void saveNotification({ notifyModeration: value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">微信通知总开关</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">关闭后暂停该实例所有推送</p>
                  </div>
                  <Switch
                    checked={data.wechatNotificationEnabled}
                    onCheckedChange={(value) =>
                      void saveNotification({ wechatNotificationEnabled: value })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
              </Card>
            </div>
          </main>
        </div>
    </div>
  );
}
