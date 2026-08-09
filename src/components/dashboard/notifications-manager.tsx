"use client";

import * as React from "react";
import { Bell, CheckCircle2, Loader2, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface NotificationInstance {
  id: string;
  slug: string;
  name: string;
  notifyNewComment: boolean;
  notifyReply: boolean;
  notifyModeration: boolean;
  notificationEmail: string | null;
}

interface NotificationDraft {
  notifyNewComment: boolean;
  notifyReply: boolean;
  notifyModeration: boolean;
  notificationEmail: string;
}

interface NotificationsManagerProps {
  instances: NotificationInstance[];
  defaultEmail: string;
  emailNotificationsEnabled: boolean;
}

export function NotificationsManager({
  instances: initial,
  defaultEmail,
  emailNotificationsEnabled,
}: NotificationsManagerProps) {
  const [instances, setInstances] = React.useState(initial);
  const [drafts, setDrafts] = React.useState<Record<string, NotificationDraft>>(() =>
    Object.fromEntries(
      initial.map((instance) => [
        instance.id,
        {
          notifyNewComment: instance.notifyNewComment,
          notifyReply: instance.notifyReply,
          notifyModeration: instance.notifyModeration,
          notificationEmail: instance.notificationEmail || defaultEmail,
        },
      ]),
    ),
  );
  const [savingId, setSavingId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  function update(instanceId: string, patch: Partial<NotificationDraft>) {
    setMessage("");
    setError("");
    setDrafts((current) => ({
      ...current,
      [instanceId]: { ...current[instanceId], ...patch },
    }));
  }

  async function save(instance: NotificationInstance) {
    const draft = drafts[instance.id];
    const email = draft.notificationEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("邮箱格式不正确");
      return;
    }
    setSavingId(instance.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/dashboard/instances/${instance.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notifyNewComment: draft.notifyNewComment,
          notifyReply: draft.notifyReply,
          notifyModeration: draft.notifyModeration,
          notificationEmail: email || null,
        }),
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: NotificationInstance;
      };
      if (!response.ok || !payload.data) {
        setError(payload.errmsg || "保存失败");
        return;
      }
      setInstances((current) =>
        current.map((item) => (item.id === instance.id ? payload.data! : item)),
      );
      setDrafts((current) => ({
        ...current,
        [instance.id]: {
          notifyNewComment: payload.data!.notifyNewComment,
          notifyReply: payload.data!.notifyReply,
          notifyModeration: payload.data!.notifyModeration,
          notificationEmail: payload.data!.notificationEmail || defaultEmail,
        },
      }));
      setMessage("通知设置已保存");
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setSavingId("");
    }
  }

  if (instances.length === 0) {
    return (
      <div className="rounded-lg border bg-background px-6 py-16 text-center">
        <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">还没有可配置的实例</p>
        <p className="mt-1 text-sm text-muted-foreground">创建实例后即可设置邮件通知。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">通知设置</h1>
        <p className="text-sm text-muted-foreground">
          选择需要接收邮件的事件，并设置收件地址。
        </p>
      </div>

      {!emailNotificationsEnabled ? (
        <div className="rounded-md border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          当前免费套餐不包含邮件通知，升级套餐后即可启用。
        </div>
      ) : null}

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

      <div className="grid gap-4 lg:grid-cols-2">
        {instances.map((instance) => {
          const draft = drafts[instance.id];
          const saving = savingId === instance.id;
          return (
            <Card key={instance.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  {instance.name}
                </CardTitle>
                <CardDescription>{instance.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor={`email-${instance.id}`}>收件邮箱</Label>
                  <Input
                    id={`email-${instance.id}`}
                    type="email"
                    value={draft.notificationEmail}
                    onChange={(event) =>
                      update(instance.id, { notificationEmail: event.target.value })
                    }
                    placeholder={defaultEmail || "you@example.com"}
                    disabled={!emailNotificationsEnabled}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">新评论通知</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">有新评论进入实例时发送</p>
                    </div>
                    <Switch
                      checked={draft.notifyNewComment}
                      onCheckedChange={(value) =>
                        update(instance.id, { notifyNewComment: value })
                      }
                      disabled={!emailNotificationsEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">回复通知</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">评论被回复时通知作者</p>
                    </div>
                    <Switch
                      checked={draft.notifyReply}
                      onCheckedChange={(value) => update(instance.id, { notifyReply: value })}
                      disabled={!emailNotificationsEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">待审核通知</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">评论进入待审核状态时发送</p>
                    </div>
                    <Switch
                      checked={draft.notifyModeration}
                      onCheckedChange={(value) =>
                        update(instance.id, { notifyModeration: value })
                      }
                      disabled={!emailNotificationsEnabled}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => void save(instance)}
                  disabled={saving || !emailNotificationsEnabled}
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  保存通知设置
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
