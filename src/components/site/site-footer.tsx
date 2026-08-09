import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              书
            </span>
            无尽书证
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Waline 兼容的托管评论服务，为博客和独立站点提供快速、安全、可扩展的评论基础设施。
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">产品</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link href="/#features" className="hover:text-foreground">
              功能
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              定价
            </Link>
            <Link href="/docs" className="hover:text-foreground">
              文档
            </Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">开发者</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link href="/docs#quick-start" className="hover:text-foreground">
              快速接入
            </Link>
            <Link href="/docs#api" className="hover:text-foreground">
              API 参考
            </Link>
            <Link href="/docs#waline" className="hover:text-foreground">
              Waline 兼容
            </Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">账号</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              登录
            </Link>
            <Link href="/register" className="hover:text-foreground">
              注册
            </Link>
            <Link href="/dashboard" className="hover:text-foreground">
              控制台
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© 2026 无尽书证</span>
          <span>由 Waline 兼容 API 驱动</span>
        </div>
      </div>
    </footer>
  );
}
