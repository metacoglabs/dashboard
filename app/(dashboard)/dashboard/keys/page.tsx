"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { relTime } from "@/lib/utils";

type ApiKey = {
  id: string;
  prefix: string;
  display_id: string | null;
  name: string | null;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type CreateResp = { api_key: string; key: ApiKey };

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRevoked, setShowRevoked] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateResp | null>(null);
  const [copiedNewKey, setCopiedNewKey] = useState(false);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch(`/api/keys${showRevoked ? "?include_revoked=true" : ""}`);
      if (res.ok) setKeys(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRevoked]);

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() || undefined }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e?.message || e?.error || "Failed to create key");
        return;
      }
      const data: CreateResp = await res.json();
      setCreated(data);
      setNewKeyName("");
      fetchKeys();
    } finally {
      setCreating(false);
    }
  }

  async function copyCreated() {
    if (!created) return;
    await navigator.clipboard.writeText(created.api_key);
    setCopiedNewKey(true);
    toast.success("API key copied");
    setTimeout(() => setCopiedNewKey(false), 1600);
  }

  async function revoke(id: string, label: string) {
    if (!confirm(`Revoke ${label}? This cannot be undone.`)) return;
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      toast.error(e?.message || "Failed to revoke");
      return;
    }
    toast.success("Key revoked");
    fetchKeys();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Used by the SDK to authenticate with the Tex API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showRevoked ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowRevoked((v) => !v)}
          >
            {showRevoked ? "Hiding revoked" : "Show revoked"}
          </Button>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus />
            New key
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-border bg-secondary/40 text-muted-foreground">
                <KeyRound className="size-5" />
              </div>
              <p className="text-sm font-medium">No API keys yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Mint one to start authenticating with the SDK.
              </p>
              <Button className="mt-5" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                Create first key
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center gap-4 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground">
                    <KeyRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {k.name || "Untitled"}
                      </span>
                      {!k.is_active && <Badge variant="muted">Revoked</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <code className="font-mono">
                        {k.prefix}{k.display_id ?? ""}…
                      </code>
                      <span>·</span>
                      <span>created {relTime(k.created_at)}</span>
                      {k.last_used_at && (
                        <>
                          <span>·</span>
                          <span>last used {relTime(k.last_used_at)}</span>
                        </>
                      )}
                      {k.revoked_at && (
                        <>
                          <span>·</span>
                          <span>revoked {relTime(k.revoked_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {k.is_active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => revoke(k.id, k.name || k.id)}
                      title="Revoke"
                      aria-label="Revoke"
                    >
                      <Trash2 className="text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreated(null);
            setNewKeyName("");
          }
        }}
      >
        <DialogContent>
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle>Save your new key</DialogTitle>
                <DialogDescription>
                  This key is shown only once. Store it somewhere safe — we can't recover it.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-sm">
                  {created.api_key}
                </code>
                <Button variant="outline" size="icon" onClick={copyCreated} aria-label="Copy">
                  {copiedNewKey ? <Check className="text-emerald-400" /> : <Copy />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreateOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Give it a label so you remember where it's used.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyname">Label</Label>
                  <Input
                    id="keyname"
                    placeholder="production"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    maxLength={64}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createKey} disabled={creating}>
                  {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                  Create key
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
