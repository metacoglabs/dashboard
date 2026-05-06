import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* faint dotted-grid backdrop */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 400px at 50% -10%, hsl(var(--accent)/0.5), transparent 70%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <Logo />
          <span>Tex</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="https://docs.getmetacognition.com" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-12rem)] max-w-6xl items-center justify-center px-6 pb-24">
        {children}
      </main>
    </div>
  );
}

function Logo() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-[10px] font-bold tracking-tight">
      tx
    </span>
  );
}
