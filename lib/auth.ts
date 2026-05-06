/**
 * Cookie-based auth glue. We store the IB-issued JWT in an httpOnly cookie
 * (browser can't read it) and read it on the server in API routes / server
 * components. The browser only ever sees usage data and key metadata.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "tex_session";
/** 24 hours, matching IB's default JWT lifetime. */
const COOKIE_MAX_AGE = 60 * 60 * 24;

export type Session = {
  jwt: string;
};

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const v = c.get(COOKIE_NAME)?.value;
  if (!v) return null;
  try {
    const parsed = JSON.parse(v) as Session;
    if (!parsed.jwt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

/** Convenience: 401 if there's no session. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}
