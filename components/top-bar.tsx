"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

type Me = { org_id: string; user_id: string | null };

export function TopBar() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMe({ org_id: data.org_id, user_id: data.user_id }))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur lg:px-10">
      <div className="text-sm">
        <span className="text-muted-foreground">Org</span>
        <span className="ml-2 font-mono text-xs">
          {me ? me.org_id : "—"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
