"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact, formatNumber } from "@/lib/utils";

type UsageQuotaStatus = {
  tokens_in_used: number;
  tokens_out_used: number;
  tokens_in_limit: number;
  tokens_out_limit: number;
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

export default function UsagePage() {
  const [today, setToday] = useState<UsageQuotaStatus | null>(null);
  const [months, setMonths] = useState<UsageWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const monthStrings: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthStrings.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    Promise.all([
      fetch("/api/usage/today").then((r) => (r.ok ? r.json() : null)),
      Promise.all(
        monthStrings.map((m) =>
          fetch(`/api/usage/summary?month=${m}`).then((r) => (r.ok ? r.json() : null)),
        ),
      ),
    ])
      .then(([t, ms]) => {
        setToday(t);
        setMonths(ms.filter(Boolean) as UsageWindow[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(
    () =>
      months.map((m) => {
        const d = new Date(m.start);
        return {
          label: d.toLocaleDateString(undefined, { month: "short" }),
          tokens_in: m.tokens_in,
          tokens_out: m.tokens_out,
        };
      }),
    [months],
  );

  const currentMonth = months[months.length - 1];

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Token-level metering. Usage is recorded server-side and reflected here within seconds.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
            <CardDescription>UTC day window. Resets at 00:00 UTC.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Bar2
              label="tokens in"
              used={today?.tokens_in_used ?? 0}
              limit={today?.tokens_in_limit ?? 1}
              loading={loading}
            />
            <Bar2
              label="tokens out"
              used={today?.tokens_out_used ?? 0}
              limit={today?.tokens_out_limit ?? 1}
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">This month</CardTitle>
            <CardDescription>Calendar month, UTC.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-7 w-32" />
              </>
            ) : currentMonth ? (
              <>
                <Row label="tokens in" value={formatNumber(currentMonth.tokens_in)} />
                <Row label="tokens out" value={formatNumber(currentMonth.tokens_out)} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data this month yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 6 months</CardTitle>
          <CardDescription>Tokens in vs tokens out, by calendar month.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap={20}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => formatCompact(v)}
                    width={48}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--accent) / 0.4)" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    itemStyle={{ color: "hsl(var(--muted-foreground))" }}
                    formatter={(v: number) => formatNumber(v)}
                  />
                  <Bar dataKey="tokens_in" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} />
                    ))}
                  </Bar>
                  <Bar dataKey="tokens_out" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Bar2({
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
          className={`h-full transition-all ${danger ? "bg-destructive" : warn ? "bg-amber-500" : "bg-foreground"}`}
          style={{ width: `${pct.toFixed(2)}%` }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
