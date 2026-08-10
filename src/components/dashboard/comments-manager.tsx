"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface DashboardCommentItem {
  objectId: number;
  nick: string;
  mail: string | null;
  link: string | null;
  ip: string | null;
  addr: string | null;
  browser: string | null;
  os: string | null;
  comment: string;
  status: "approved" | "waiting" | "spam";
  sticky: boolean;
  url: string;
  createdAt: string;
  instance: { id: string; slug: string; name: string };
}

interface CommentsManagerProps {
  instances: Array<{ id: string; slug: string; name: string }>;
  initialComments: DashboardCommentItem[];
  initialCount: number;
  initialTotalPages: number;
  initialPage?: number;
}

export function CommentsManager({
  instances,
  initialComments,
  initialCount,
  initialTotalPages,
  initialPage = 1,
}: CommentsManagerProps) {
  const [comments, setComments] = React.useState(initialComments);
  const [page, setPage] = React.useState(initialPage);
  const [jumpPage, setJumpPage] = React.useState(String(initialPage));
  const [count, setCount] = React.useState(initialCount);
  const [totalPages, setTotalPages] = React.useState(Math.max(1, initialTotalPages));
  const [keyword, setKeyword] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [instanceId, setInstanceId] = React.useState("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function load(requestedPage = 1) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(requestedPage), pageSize: "50" });
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (status !== "all") params.set("status", status);
      if (instanceId !== "all") params.set("instanceId", instanceId);
      const response = await fetch(`/api/dashboard/comments?${params}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        errno?: number;
        errmsg?: string;
        data?: DashboardCommentItem[];
        count?: number;
        page?: number;
        totalPages?: number;
      };
      if (!response.ok) {
        setError(payload.errmsg || "加载失败");
        return;
      }
      setComments(payload.data || []);
      setCount(payload.count ?? 0);
      setPage(payload.page ?? requestedPage);
      setJumpPage(String(payload.page ?? requestedPage));
      setTotalPages(Math.max(1, payload.totalPages ?? 1));
    } catch {
      setError("网络请求失败");
    } finally {
      setLoading(false);
    }
  }

  async function update(objectId: number, body: Record<string, unknown>) {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/comments/${objectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { errno?: number; errmsg?: string };
      if (!response.ok) {
        setError(payload.errmsg || "操作失败");
        return;
      }
      setComments((current) =>
        current.map((comment) =>
          comment.objectId === objectId
            ? {
                ...comment,
                ...(body.status ? { status: body.status as DashboardCommentItem["status"] } : {}),
                ...(typeof body.sticky === "boolean" ? { sticky: body.sticky } : {}),
              }
            : comment,
        ),
      );
    } catch {
      setError("网络请求失败");
    } finally {
      setLoading(false);
    }
  }

  async function remove(objectId: number) {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/comments/${objectId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { errmsg?: string };
        setError(payload.errmsg || "删除失败");
        return;
      }
      setComments((current) => current.filter((comment) => comment.objectId !== objectId));
    } catch {
      setError("网络请求失败");
    } finally {
      setLoading(false);
    }
  }

  function jumpToPage() {
    const target = Math.min(totalPages, Math.max(1, Number(jumpPage) || 1));
    if (target !== page) void load(target);
    else setJumpPage(String(page));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">评论管理</h1>
          <p className="text-sm text-muted-foreground">
            搜索、审核并管理全部实例收到的评论。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 sm:w-52"
              placeholder="搜索昵称或内容"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void load()}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="waiting">待审核</SelectItem>
              <SelectItem value="approved">已发布</SelectItem>
              <SelectItem value="spam">垃圾</SelectItem>
            </SelectContent>
          </Select>
          <Select value={instanceId} onValueChange={setInstanceId}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部实例</SelectItem>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  {instance.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            查询
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {comments.length === 0 ? (
        <div className="rounded-lg border bg-background px-6 py-16 text-center">
          <p className="text-sm font-medium">没有符合条件的评论</p>
          <p className="mt-1 text-sm text-muted-foreground">调整筛选条件后再试。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="divide-y">
            {comments.map((comment) => (
              <div key={comment.objectId} className="px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{comment.nick}</span>
                      {comment.mail ? (
                        <span className="text-xs text-muted-foreground">{comment.mail}</span>
                      ) : null}
                      <Badge
                        variant={
                          comment.status === "approved"
                            ? "success"
                            : comment.status === "spam"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {comment.status === "approved"
                          ? "已发布"
                          : comment.status === "spam"
                            ? "垃圾"
                            : "待审核"}
                      </Badge>
                      {comment.sticky ? <Badge variant="secondary">置顶</Badge> : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.comment}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {comment.instance.name} · {comment.url} · {formatDate(new Date(comment.createdAt))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {comment.browser || comment.os ? (
                        <span>
                          {[comment.browser, comment.os].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                      {comment.ip ? <span>IP {comment.ip}</span> : null}
                      {comment.addr ? <span>{comment.addr}</span> : null}
                      {comment.link ? (
                        <a
                          href={comment.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {comment.link}
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {comment.status !== "approved" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="通过评论"
                        onClick={() => void update(comment.objectId, { status: "approved" })}
                      >
                        <CheckCircle2 className="text-emerald-600" />
                      </Button>
                    ) : null}
                    {comment.status !== "spam" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="标记垃圾"
                        onClick={() => void update(comment.objectId, { status: "spam" })}
                      >
                        <Flag className="text-amber-600" />
                      </Button>
                    ) : null}
                    {comment.status !== "waiting" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="移入待审核"
                        onClick={() => void update(comment.objectId, { status: "waiting" })}
                      >
                        <RotateCcw />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="删除评论"
                      onClick={() => void remove(comment.objectId)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">共 {count} 条评论</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
          >
            <ChevronLeft />
            上一页
          </Button>
          <span className="min-w-20 text-center text-sm text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(event) => setJumpPage(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && jumpToPage()}
              className="h-8 w-16 text-center"
              aria-label="跳转到页"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={jumpToPage}
            >
              跳转
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => void load(page + 1)}
          >
            下一页
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
