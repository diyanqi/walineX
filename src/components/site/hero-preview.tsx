import {
  BarChart3,
  Bell,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function HeroPreview() {
  return (
    <div className="relative overflow-hidden rounded-t-lg border border-white/15 bg-[#0c1d24] shadow-2xl">
      <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="mx-auto flex h-6 w-full max-w-xs items-center justify-center rounded border border-white/10 bg-black/30 text-[10px] text-white/60">
          dash.waline.infvar.com
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-white/[0.02] p-4 lg:block">
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-teal-500 text-[10px] font-bold text-black">
              书
            </span>
            无尽书证
          </div>
          <div className="mt-6 space-y-1">
            {[
              { label: "概览", icon: BarChart3, active: true },
              { label: "评论实例", icon: MessageSquareText },
              { label: "评论管理", icon: CheckCircle2 },
              { label: "审核", icon: ShieldCheck },
              { label: "通知", icon: Bell },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={
                    item.active
                      ? "flex items-center gap-2 rounded-md bg-teal-500/20 px-3 py-2 text-sm text-teal-300"
                      : "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/55"
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              );
            })}
          </div>
        </aside>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/90">概览</p>
              <p className="text-xs text-white/45">实例与审核数据实时更新</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="border-white/10 bg-white/10 text-white">
                <Sparkles className="h-3 w-3" />
                免费版
              </Badge>
              <span className="rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/80">
                新建实例
              </span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "评论实例", value: "3", hint: "本月新增 1" },
              { label: "累计评论", value: "12,480", hint: "本月 2,914" },
              { label: "待审核", value: "8", hint: "3 条标记垃圾" },
              { label: "已发布", value: "11,026", hint: "通过率 96%" },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[11px] text-white/45">{item.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] text-teal-300/80">{item.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-hidden rounded-md border border-white/10">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-2.5 text-[11px] font-medium text-white/45">
              <span>评论</span>
              <span>内容</span>
              <span>状态</span>
            </div>
            {[
              { nick: "小鹿", content: "这篇关于部署的文章很有帮助，已经接入评论了。", status: "已发布", tone: "text-teal-300" },
              { nick: "阿澈", content: "PoW 验证在移动端也很流畅。", status: "已发布", tone: "text-teal-300" },
              { nick: "访客 8842", content: "buy cheap followers here", status: "垃圾", tone: "text-amber-300" },
              { nick: "木棉", content: "请问 AI 审核支持自定义接口吗？", status: "待审核", tone: "text-white/60" },
            ].map((row) => (
              <div
                key={row.nick}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-0"
              >
                <span className="truncate text-xs text-white/80">{row.nick}</span>
                <span className="truncate text-xs text-white/50">{row.content}</span>
                <span className={`text-[11px] ${row.tone}`}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
