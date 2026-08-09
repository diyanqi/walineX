"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CapWidget } from "@/components/cap-widget";
import { formatDate } from "@/lib/utils";

export interface DashboardInstance {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  targetOrigins: string[];
  status: string;
  createdAt: Date | string;
  url: string;
  apiUrl: string;
}

interface InstancesManagerProps {
  instances: DashboardInstance[];
  planInstances: number;
  urlPrefix: string;
}

interface InstanceFormState {
  name: string;
  slug: string;
  description: string;
  targetOrigins: string;
  capToken: string | null;
}

function emptyForm(): InstanceFormState {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    name: "",
    slug: `site-${suffix}`,
    description: "",
    targetOrigins: "",
    capToken: null,
  };
}

export function InstancesManager({
  instances: initial,
  planInstances,
  urlPrefix,
}: InstancesManagerProps) {
  const [instances, setInstances] = React.useState(initial);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DashboardInstance | null>(null);
  const [deleting, setDeleting] = React.useState<DashboardInstance | null>(null);
  const [form, setForm] = React.useState<InstanceFormState>(emptyForm());
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const canCreate = instances.length < planInstances;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setMessage("");
    setDialogOpen(true);
  }

  function openEdit(instance: DashboardInstance) {
    setEditing(instance);
    setForm({
      name: instance.name,
      slug: instance.slug,
      description: instance.description || "",
      targetOrigins: (instance.targetOrigins || []).join("\n"),
      capToken: null,
    });
    setMessage("");
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      setMessage("请输入实例名称");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(form.slug)) {
      setMessage("实例标识只能包含小写字母、数字和连字符");
      return;
    }
    if (!editing && !form.capToken) {
      setMessage("请先完成人机验证");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        editing ? `/api/dashboard/instances/${editing.id}` : "/api/dashboard/instances",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...(editing ? {} : { capToken: form.capToken }),
            name: form.name.trim(),
            slug: form.slug,
            description: form.description.trim(),
            targetOrigins: form.targetOrigins
              .split(/\n/)
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        },
      );
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: DashboardInstance;
      };
      if (!response.ok || !payload.data) {
        setMessage(payload.errmsg || "保存失败，请重试");
        return;
      }
      setInstances((current) =>
        editing
          ? current.map((item) => (item.id === editing.id ? payload.data! : item))
          : [payload.data!, ...current],
      );
      setDialogOpen(false);
    } catch {
      setMessage("网络请求失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(instance: DashboardInstance) {
    setBusy(true);
    try {
      const response = await fetch(`/api/dashboard/instances/${instance.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: instance.status === "active" ? "disabled" : "active",
        }),
      });
      const payload = (await response.json()) as { errno?: number; errmsg?: string };
      if (!response.ok) {
        setMessage(payload.errmsg || "操作失败");
        return;
      }
      setInstances((current) =>
        current.map((item) =>
          item.id === instance.id
            ? {
                ...item,
                status: item.status === "active" ? "disabled" : "active",
              }
            : item,
        ),
      );
    } catch {
      setMessage("网络请求失败");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/dashboard/instances/${deleting.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setMessage("删除失败，请重试");
        return;
      }
      setInstances((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch {
      setMessage("网络请求失败");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl(instance: DashboardInstance) {
    try {
      await navigator.clipboard.writeText(instance.apiUrl);
      setCopiedId(instance.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setMessage("复制失败，请手动复制");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">评论实例</h1>
          <p className="text-sm text-muted-foreground">
            每个实例对应一个独立的 Waline 兼容 API 地址。
          </p>
        </div>
        <Button onClick={openCreate} disabled={!canCreate || busy}>
          <Plus />
          新建实例
        </Button>
      </div>

      {!canCreate ? (
        <div className="rounded-md border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          当前套餐已达到实例数量上限，升级套餐后可创建更多实例。
        </div>
      ) : null}

      {message ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}

      {instances.length === 0 ? (
        <div className="rounded-lg border bg-background px-6 py-16 text-center">
          <p className="text-sm font-medium">还没有评论实例</p>
          <p className="mt-1 text-sm text-muted-foreground">创建第一个实例后即可接入你的网站。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_auto] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground sm:grid">
            <span>实例</span>
            <span>API 地址</span>
            <span className="text-right">操作</span>
          </div>
          <div className="divide-y">
            {instances.map((instance) => (
              <div
                key={instance.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{instance.name}</span>
                    <Badge
                      variant={
                        instance.status === "active"
                          ? "success"
                          : instance.status === "suspended"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {instance.status === "active" ? "运行中" : "已停用"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {instance.description || "暂无描述"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    创建于 {formatDate(new Date(instance.createdAt))}
                  </p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="truncate rounded border bg-muted/50 px-2 py-1 text-xs">
                      {instance.apiUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="复制 API 地址"
                      onClick={() => void copyUrl(instance)}
                    >
                      {copiedId === instance.id ? (
                        <Check className="text-emerald-600" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{instance.url}</span>
                    <span>
                      {instance.targetOrigins?.length
                        ? `${instance.targetOrigins.length} 个接入网站`
                        : "允许任意网站"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Power className="h-3 w-3" />
                      {instance.status === "active" ? "评论 API 可访问" : "评论 API 已停用"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Switch
                    checked={instance.status === "active"}
                    onCheckedChange={() => void toggle(instance)}
                    aria-label="启用或停用实例"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="编辑实例"
                    onClick={() => openEdit(instance)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="删除实例"
                    onClick={() => setDeleting(instance)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑实例" : "新建实例"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "修改实例名称、标识或描述。"
                : "实例标识会用于生成你的专属 API 地址。"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="instance-name">实例名称</Label>
              <Input
                id="instance-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="我的博客"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instance-slug">实例标识</Label>
              <Input
                id="instance-slug"
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value.toLowerCase() })
                }
                maxLength={63}
              />
              <p className="text-xs text-muted-foreground">
                {urlPrefix}
                {form.slug}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instance-description">描述</Label>
              <Textarea
                id="instance-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instance-origins">允许接入的网站</Label>
              <Textarea
                id="instance-origins"
                value={form.targetOrigins}
                onChange={(event) =>
                  setForm({ ...form, targetOrigins: event.target.value })
                }
                rows={3}
                placeholder={"https://example.com\nhttps://blog.example.org"}
              />
              <p className="text-xs text-muted-foreground">
                留空表示不限制来源；填写后会拦截未列入的网站请求。
              </p>
            </div>
            {!editing ? (
              <CapWidget scope="instance" onToken={(token) => setForm({ ...form, capToken: token })} />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {editing ? "保存修改" : "创建实例"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除实例</DialogTitle>
            <DialogDescription>
              删除后该实例的评论 API 将停止服务，历史评论会被保留但不再公开。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
