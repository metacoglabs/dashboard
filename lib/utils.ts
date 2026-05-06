import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact number formatter — 1234 → "1,234", 1234567 → "1.23M". */
export function formatCompact(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) return (n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "k";
  if (n < 1_000_000_000) return (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "M";
  return (n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "B";
}

/** Always full count with thousands separators. */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Relative time — "3 minutes ago", "2 days ago". */
export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
