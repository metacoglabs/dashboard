"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Key, LayoutDashboard, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/dashboard/usage", label: "Usage", icon: Activity },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/30 lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5 text-sm font-semibold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-[10px] font-bold tracking-tight">
          tx
        </span>
        <span>Tex</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="https://docs.getmetacognition.com"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <BookOpen className="size-4" />
          <span>Docs</span>
        </Link>
      </div>
    </aside>
  );
}
