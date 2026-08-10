"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  Gauge,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquareText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "概览", icon: Gauge, exact: true },
  { href: "/dashboard/instances", label: "实例", icon: BookOpenCheck },
  { href: "/dashboard/comments", label: "评论", icon: MessageSquareText },
  { href: "/dashboard/moderation", label: "审核", icon: ShieldCheck },
  { href: "/dashboard/notifications", label: "通知", icon: Bell },
  { href: "/dashboard/settings", label: "设置", icon: Settings },
];

interface DashboardNavProps {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  plan: string;
}

export function DashboardNav({ name, email, avatar, plan }: DashboardNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
          </span>
          <span className="hidden sm:inline">无尽书证</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <span className="rounded-md border px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
            {plan}
          </span>
          <Avatar className="h-8 w-8">
            {avatar ? <AvatarImage src={avatar} alt={name || "用户"} /> : null}
            <AvatarFallback className="text-xs">
              {(name || email || "用").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <form action="/api/logout" method="post">
            <Button type="submit" variant="ghost" size="icon" aria-label="退出登录">
              <LogOut />
            </Button>
          </form>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="打开导航"
        >
          <Menu />
        </Button>
      </div>
      {open ? (
        <nav className="border-t bg-background px-4 py-3 md:hidden">
          <div className="grid gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <form action="/api/logout" method="post">
              <Button type="submit" variant="ghost" className="w-full justify-start">
                <LogOut />
                退出登录
              </Button>
            </form>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
