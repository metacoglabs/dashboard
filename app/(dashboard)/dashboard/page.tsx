"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Activity, Database, Key, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

type UsageQuotaStatus = {
  tokens_in_used: number;
  tokens_out_used: number;
  tokens_in_limit: number;
  tokens_out_limit: number;
  period: string;
  period_start: string;
  period_end: string;
};

type UsageWindow = {
  period: string;
  start: string;
  end: string;
  tokens_in: number;
  tokens_out: number;
};

type Me = {
  org_id: string;
  api_keys: { id: string; is_active: boolean }[];
};

export default function OverviewPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [today, setToday] = useState<UsageQuotaStatus | null>(null);
  const [month, setMonth] = useState<UsageWindow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/usage/today").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/usage/summary").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([m, t, s]) => {
        setMe(m);
        setToday(t);
        setMonth(s);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your usage and quota at a glance.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tokens in (today)"
          value={today?.tokens_in_used}
          subtitle={today ? `of ${formatNumber(today.tokens_in_limit)} daily` : undefined}
          icon={<Zap className="size-4" />}
          loading={loading}
          progress={today ? today.tokens_in_used / today.tokens_in_limit : 0}
        />
        <StatCard
          title="Tokens out (today)"
          value={today?.tokens_out_used}
          subtitle={today ? `of ${formatNumber(today.tokens_out_limit)} daily` : undefined}
          icon={<Activity className="size-4" />}
          loading={loading}
          progress={today ? today.tokens_out_used / today.tokens_out_limit : 0}
        />
        <StatCard
          title="Tokens in (this month)"
          value={month?.tokens_in}
          subtitle="month-to-date"
          icon={<Database className="size-4" />}
          loading={loading}
        />
        <StatCard
          title="Active API keys"
          value={me?.api_keys.filter((k) => k.is_active).length}
          subtitle={
            me?.api_keys.length
              ? `${me.api_keys.length - me.api_keys.filter((k) => k.is_active).length} revoked`
              : undefined
          }
          icon={<Key className="size-4" />}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Get started</CardTitle>
              <Badge variant="muted">3 steps</Badge>
            </div>
            <CardDescription>Make your first /recall in under a minute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Step n={1} title="Install the SDK">
              <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-secondary/30 p-3 font-mono text-xs">
{`pip install tex-sdk`}
              </pre>
            </Step>
            <Step n={2} title="Set your API key">
              <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-secondary/30 p-3 font-mono text-xs">
{`export TEX_API_KEY=tex_live_…`}
              </pre>
            </Step>
            <Step n={3} title="Remember and recall">
              <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-secondary/30 p-3 font-mono text-xs">
{`from tex import Tex
tex = Tex()
tex.conversations.remember(
  session_id="chat-1",
  turns=[{"role": "user", "text": "I love pottery", "timestamp": "..."}],
)
hits = tex.recall(q="what does the user like?", session_id="chat-1")
print(hits.usage)  # {'tokens_in': 7, 'tokens_out': 23}`}
              </pre>
            </Step>
            <div className="pt-1">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://docs.getmetacognition.com">
                  Read the docs
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quota</CardTitle>
            <CardDescription>
              Resets at 00:00 UTC daily. Free during the launch month — bills follow your token usage afterwards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <QuotaBar
              label="tokens in"
              used={today?.tokens_in_used ?? 0}
              limit={today?.tokens_in_limit ?? 1}
              loading={loading}
            />
            <QuotaBar
              label="tokens out"
              used={today?.tokens_out_used ?? 0}
              limit={today?.tokens_out_limit ?? 1}
              loading={loading}
            />
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              At 80% of either cap we'll send a warning. At 100% requests
              return <code className="font-mono">429</code> until reset.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  progress,
}: {
  title: string;
  value: number | undefined;
  subtitle?: string;
  icon: React.ReactNode;
  loading: boolean;
  progress?: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="mt-2">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {value !== undefined ? formatNumber(value) : "—"}
            </span>
          )}
        </div>
        {subtitle && !loading && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {typeof progress === "number" && !loading && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100)).toFixed(2)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuotaBar({
  label,
  used,
  limit,
  loading,
}: {
  label: string;
  used: number;
  limit: number;
  loading: boolean;
}) {
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
  const danger = pct >= 100;
  const warn = pct >= 80;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        {loading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="tabular-nums text-muted-foreground">
            {formatNumber(used)} / {formatNumber(limit)}
          </span>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all ${
            danger ? "bg-destructive" : warn ? "bg-amber-500" : "bg-foreground"
          }`}
          style={{ width: `${pct.toFixed(2)}%` }}
        />
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50 text-[11px] font-medium text-muted-foreground">
        {n}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}
