"use client";

import { Button } from "@/components/ui/button";

export function TenantProfileActions({ dashboardUrl }: { dashboardUrl?: string }) {
  return (
    <div className="flex gap-3">
      {dashboardUrl ? (
        <Button asChild variant="outline">
          <a href={dashboardUrl}>打开控制台</a>
        </Button>
      ) : null}
      <Button className="flex-1" onClick={() => window.close()}>
        关闭窗口
      </Button>
    </div>
  );
}
