import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "无尽书证 | Waline 兼容托管评论服务",
    template: "%s | 无尽书证",
  },
  description:
    "为博客和网站提供 Waline 兼容的托管评论服务，支持多实例、审核、通知和可扩展套餐。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
