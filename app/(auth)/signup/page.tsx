"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignupResp = {
  org_id: string;
  user_id: string;
  api_key: string;
  key: { id: string; prefix: string; display_id: string | null; name: string | null };
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SignupResp | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody?.message || errBody?.error || `Signup failed (${res.status})`);
        return;
      }
      const data: SignupResp = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!result) return;
    await navigator.clipboard.writeText(result.api_key);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 1600);
  }

  if (result) {
    return (
      <div className="mx-auto w-full max-w-xl animate-fade-in">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                Account created
              </span>
            </div>
            <CardTitle className="text-2xl">Save your API key</CardTitle>
            <CardDescription>
              This key is shown only once. Store it in a secure place — a password manager,
              your CI secrets, or a <code className="font-mono text-[0.78rem]">.env</code> file
              you don't commit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                API key
              </Label>
              <div className="mt-2 flex gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-sm">
                  {result.api_key}
                </code>
                <Button variant="outline" size="icon" onClick={copyKey} aria-label="Copy">
                  {copied ? <Check className="text-emerald-400" /> : <Copy />}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Org ID" value={result.org_id} mono />
              <Field
                label="Key fingerprint"
                value={`${result.key.prefix}${result.key.display_id ?? ""}…`}
                mono
              />
            </div>

            <div className="rounded-md border border-border bg-secondary/30 p-4 text-sm">
              <p className="font-medium">Try it out</p>
              <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-muted-foreground">
{`pip install tex-sdk
export TEX_API_KEY=${result.api_key.slice(0, 16)}...`}
              </pre>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link href="https://docs.getmetacognition.com">Read the docs</Link>
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                Continue to dashboard
                <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col justify-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          The memory layer for AI agents.
        </h1>
        <p className="mt-4 max-w-md text-balance text-muted-foreground">
          Persistent, queryable memory across conversations. Sub-second recall,
          token-priced billing, no vendor lock-in.
        </p>
        <ul className="mt-8 space-y-3 text-sm">
          <Bullet>One API for ingestion, recall, and reasoning over memory</Bullet>
          <Bullet>Multi-tenant by default — your app's users, isolated</Bullet>
          <Bullet>Free tier on signup. No credit card.</Bullet>
        </ul>
      </div>

      <Card className="self-center">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            We'll generate a fresh org and API key. Free during the launch month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project name (optional)</Label>
              <Input
                id="name"
                placeholder="my-agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                We'll label your first key with this. You can rename later.
              </p>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {submitting ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have a key?{" "}
              <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
              .
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-muted-foreground">
      <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className={`mt-1 truncate rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
