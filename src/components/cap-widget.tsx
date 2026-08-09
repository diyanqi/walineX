"use client";

import * as React from "react";
import "cap-widget";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck } from "lucide-react";
import { CAP_SCOPES, type CapScope } from "@/lib/cap-shared";

interface CapWidgetProps {
  scope?: CapScope;
  onToken?: (token: string | null) => void;
  className?: string;
  compact?: boolean;
}

export function CapWidget({
  scope = "login",
  onToken,
  className,
  compact = false,
}: CapWidgetProps) {
  const ref = React.useRef<HTMLElementTagNameMap["cap-widget"] | null>(null);
  const [state, setState] = React.useState<"idle" | "solving" | "solved" | "error">("idle");
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const widget = ref.current;
    if (!widget) return;

    const onSolve = (event: Event) => {
      const token = (event as CustomEvent<{ token: string }>).detail?.token;
      setState(token ? "solved" : "error");
      onToken?.(token ?? null);
    };
    const onProgress = (event: Event) => {
      setState("solving");
      setProgress((event as CustomEvent<{ progress: number }>).detail?.progress ?? 0);
    };
    const onError = () => {
      setState("error");
      onToken?.(null);
    };
    const onReset = () => {
      setState("idle");
      setProgress(0);
      onToken?.(null);
    };

    widget.addEventListener("solve", onSolve);
    widget.addEventListener("progress", onProgress);
    widget.addEventListener("error", onError);
    widget.addEventListener("reset", onReset);
    return () => {
      widget.removeEventListener("solve", onSolve);
      widget.removeEventListener("progress", onProgress);
      widget.removeEventListener("error", onError);
      widget.removeEventListener("reset", onReset);
    };
  }, [onToken]);

  return (
    <div className={cn("space-y-2", className)}>
      <cap-widget
        ref={ref}
        data-cap-api-endpoint={`/api/cap/${CAP_SCOPES[scope]}/`}
        data-cap-i18n-initial-state={compact ? "验证后继续" : "完成安全验证"}
        data-cap-i18n-verifying-label={compact ? "正在验证" : "正在完成安全验证"}
        data-cap-i18n-solved-label={compact ? "已验证" : "人机验证已通过"}
        data-cap-i18n-error-label="验证失败，请重试"
        data-cap-worker-count="4"
      />
      {state === "solving" ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {Math.round(progress * 100)}%
        </p>
      ) : null}
      {state === "solved" ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          验证完成
        </p>
      ) : null}
    </div>
  );
}
