"use client";

import * as React from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Filter,
  Flag,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export interface ModerationInstanceOption {
  id: string;
  slug: string;
  name: string;
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

export interface ModerationData {
  instance: {
    id: string;
    slug: string;
    name: string;
    moderationEnabled: boolean;
    sensitiveWordMode: "block" | "replace" | "review";
    defaultCommentStatus: "approved" | "waiting" | "spam";
    akismetEnabled: boolean;
    akismetConfigured: boolean;
    aiModerationEnabled: boolean;
    aiApiBaseUrl: string | null;
    aiModel: string | null;
    aiConfigured: boolean;
    allowAnonymous: boolean;
    requireCap: boolean;
  };
  sensitiveWords: SensitiveWordItem[];
  moderationRules: ModerationRuleItem[];
}

const WORD_ACTION_LABELS: Record<SensitiveWordItem["action"], string> = {
  block: "拦截",
  replace: "替换",
  review: "审核",
};

const RULE_TYPE_LABELS: Record<string, string> = {
  ip_blacklist: "IP 黑名单",
  user_blacklist: "用户黑名单",
  email_blacklist: "邮箱黑名单",
  url_blacklist: "链接黑名单",
  nick_blacklist: "昵称黑名单",
};

const WORD_MODE_LABELS = {
  block: "拦截命中内容",
  replace: "替换命中内容",
  review: "转入待审核",
} as const;

interface ModerationManagerProps {
  instances: ModerationInstanceOption[];
  initial: ModerationData | null;
}

export function ModerationManager({ instances, initial }: ModerationManagerProps) {
  const [selected, setSelected] = React.useState(initial?.instance.id || "");
  const [data, setData] = React.useState<ModerationData | null>(initial);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [akismetKey, setAkismetKey] = React.useState("");
  const [aiApiKey, setAiApiKey] = React.useState("");
  const [aiApiBaseUrl, setAiApiBaseUrl] = React.useState(initial?.instance.aiApiBaseUrl || "");
  const [aiModel, setAiModel] = React.useState(initial?.instance.aiModel || "");

  const [word, setWord] = React.useState("");
  const [wordAction, setWordAction] = React.useState<SensitiveWordItem["action"]>("review");
  const [replacement, setReplacement] = React.useState("");

  const [ruleType, setRuleType] = React.useState("ip_blacklist");
  const [ruleValue, setRuleValue] = React.useState("");

  async function load(instanceId: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/dashboard/instances/${instanceId}/moderation`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: ModerationData;
      };
      if (!response.ok || !payload.data) {
        setError(payload.errmsg || "加载审核设置失败");
        return;
      }
      setSelected(instanceId);
      setData(payload.data);
      setAkismetKey("");
      setAiApiKey("");
      setAiApiBaseUrl(payload.data.instance.aiApiBaseUrl || "");
      setAiModel(payload.data.instance.aiModel || "");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(patch: Record<string, unknown>) {
    if (!data) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.instance.id}/moderation`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as { errno?: number; errmsg?: string };
      if (!response.ok) {
        setError(payload.errmsg || "保存失败");
        return;
      }
      setData((current) =>
        current
          ? {
              ...current,
              instance: { ...current.instance, ...(patch as Partial<typeof current.instance>) },
            }
          : current,
      );
      setMessage("设置已保存");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function addWord() {
    if (!data || !word.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.instance.id}/words`, {
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
        setError(payload.errmsg || "添加失败");
        return;
      }
      setData((current) =>
        current
          ? {
              ...current,
              sensitiveWords: [payload.data!, ...current.sensitiveWords],
            }
          : current,
      );
      setWord("");
      setReplacement("");
      setMessage("敏感词已添加");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function removeWord(wordId: string) {
    if (!data) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(
        `/api/dashboard/instances/${data.instance.id}/words/${wordId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError("删除失败");
        return;
      }
      setData((current) =>
        current
          ? {
              ...current,
              sensitiveWords: current.sensitiveWords.filter((item) => item.id !== wordId),
            }
          : current,
      );
      setMessage("敏感词已删除");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function addRule() {
    if (!data || !ruleValue.trim()) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${data.instance.id}/rules`, {
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
        setError(payload.errmsg || "添加失败");
        return;
      }
      setData((current) =>
        current
          ? {
              ...current,
              moderationRules: [payload.data!, ...current.moderationRules],
            }
          : current,
      );
      setRuleValue("");
      setMessage("规则已添加");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(ruleId: string) {
    if (!data) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(
        `/api/dashboard/instances/${data.instance.id}/rules/${ruleId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError("删除失败");
        return;
      }
      setData((current) =>
        current
          ? {
              ...current,
              moderationRules: current.moderationRules.filter((item) => item.id !== ruleId),
            }
          : current,
      );
      setMessage("规则已删除");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (instances.length === 0) {
    return (
      <div className="rounded-lg border bg-background px-6 py-16 text-center">
        <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">还没有可配置的实例</p>
        <p className="mt-1 text-sm text-muted-foreground">先创建实例，再配置审核策略。</p>
      </div>
    );
  }

  const instance = data?.instance;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">审核设置</h1>
          <p className="text-sm text-muted-foreground">
            配置敏感词、垃圾过滤和黑名单规则。
          </p>
        </div>
        <Select value={selected} onValueChange={(value) => void load(value)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="选择实例" />
          </SelectTrigger>
          <SelectContent>
            {instances.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-md border bg-background px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载审核设置...
        </div>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : null}

      {data && instance ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                基础审核
              </CardTitle>
              <CardDescription>
                决定评论如何进入你的站点，以及匿名评论和验证策略。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">启用审核</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">关闭后评论直接按默认状态发布</p>
                  </div>
                  <Switch
                    checked={instance.moderationEnabled}
                    onCheckedChange={(value) =>
                      void saveSettings({ moderationEnabled: value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">匿名评论</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">允许未登录访客发表评论</p>
                  </div>
                  <Switch
                    checked={instance.allowAnonymous}
                    onCheckedChange={(value) => void saveSettings({ allowAnonymous: value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">评论人机验证</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">发表评论前完成 PoW 验证</p>
                  </div>
                  <Switch
                    checked={instance.requireCap}
                    onCheckedChange={(value) => void saveSettings({ requireCap: value })}
                  />
                </div>
                <div className="grid gap-2 rounded-md border p-4">
                  <Label htmlFor="sensitive-mode">敏感词模式</Label>
                  <Select
                    value={instance.sensitiveWordMode}
                    onValueChange={(value) =>
                      void saveSettings({ sensitiveWordMode: value as "block" | "replace" | "review" })
                    }
                  >
                    <SelectTrigger id="sensitive-mode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(WORD_MODE_LABELS) as Array<keyof typeof WORD_MODE_LABELS>).map(
                        (key) => (
                          <SelectItem key={key} value={key}>
                            {WORD_MODE_LABELS[key]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                垃圾与 AI 审核
              </CardTitle>
              <CardDescription>
                接入 Akismet 和 OpenAI 兼容审核接口，自动识别垃圾与不当内容。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Akismet</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {instance.akismetConfigured ? "平台全局密钥可用" : "未配置密钥"}
                    </p>
                  </div>
                  <Switch
                    checked={instance.akismetEnabled}
                    onCheckedChange={(value) => void saveSettings({ akismetEnabled: value })}
                  />
                </div>
                <div className="grid gap-2 rounded-md border p-4">
                  <Label htmlFor="akismet-key">Akismet API Key</Label>
                  <Input
                    id="akismet-key"
                    type="password"
                    value={akismetKey}
                    onChange={(event) => setAkismetKey(event.target.value)}
                    placeholder={instance.akismetConfigured ? "已配置，留空使用全局密钥" : "输入 Akismet API Key"}
                    autoComplete="off"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">AI 审核</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {instance.aiConfigured ? "平台全局密钥可用" : "未配置密钥"}
                    </p>
                  </div>
                  <Switch
                    checked={instance.aiModerationEnabled}
                    onCheckedChange={(value) => void saveSettings({ aiModerationEnabled: value })}
                  />
                </div>
                <div className="grid gap-2 rounded-md border p-4">
                  <Label htmlFor="ai-api-url">OpenAI 兼容接口地址</Label>
                  <Input
                    id="ai-api-url"
                    value={aiApiBaseUrl}
                    onChange={(event) => setAiApiBaseUrl(event.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="grid gap-2 rounded-md border p-4">
                  <Label htmlFor="ai-model">模型名称</Label>
                  <Input
                    id="ai-model"
                    value={aiModel}
                    onChange={(event) => setAiModel(event.target.value)}
                    placeholder="gpt-4o-mini"
                  />
                </div>
                <div className="grid gap-2 rounded-md border p-4">
                  <Label htmlFor="ai-key">AI API Key</Label>
                  <Input
                    id="ai-key"
                    type="password"
                    value={aiApiKey}
                    onChange={(event) => setAiApiKey(event.target.value)}
                    placeholder={instance.aiConfigured ? "已配置，留空使用全局密钥" : "输入 AI API Key"}
                    autoComplete="off"
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  void saveSettings({
                    akismetKey: akismetKey.trim() || null,
                    aiApiKey: aiApiKey.trim() || null,
                    aiApiBaseUrl,
                    aiModel,
                  })
                }
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                保存集成配置
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" />
                敏感词
              </CardTitle>
              <CardDescription>添加自定义敏感词，支持拦截、替换或转入审核。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
                <Input
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  placeholder="敏感词"
                  maxLength={100}
                />
                <Select value={wordAction} onValueChange={(value) => setWordAction(value as SensitiveWordItem["action"])}>
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
              {data.sensitiveWords.length === 0 ? (
                <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无自定义敏感词
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {data.sensitiveWords.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{item.word}</span>
                      <Badge variant={item.action === "block" ? "destructive" : item.action === "replace" ? "success" : "warning"}>
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
              {data.moderationRules.length === 0 ? (
                <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无黑名单规则
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {data.moderationRules.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <Badge variant="secondary" className="shrink-0">
                        {RULE_TYPE_LABELS[item.type] || item.type}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate font-mono text-sm">{item.value}</span>
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
        </>
      ) : (
        <div className="rounded-lg border bg-background px-6 py-16 text-center">
          <p className="text-sm font-medium">请选择实例</p>
        </div>
      )}
    </div>
  );
}
