/**
 * Server-side client for the Tex integration backend.
 *
 * All dashboard data flows through Next.js API routes that call this client.
 * The browser NEVER talks to the IB directly — that lets us keep the JWT in
 * an httpOnly cookie and avoids CORS plumbing on the IB side.
 */

const TEX_API_BASE_URL =
  process.env.TEX_API_BASE_URL ?? "http://localhost:8000";

export class TexApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
    message?: string,
  ) {
    super(message ?? `Tex API error ${status}`);
  }
}

type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  jwt?: string | null;
  body?: unknown;
  /** Throw on non-2xx (default true). When false, return whatever the server sent. */
  throwOnError?: boolean;
};

export async function texFetch<T = unknown>(
  path: string,
  opts: FetchOpts = {},
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (opts.jwt) headers["authorization"] = `Bearer ${opts.jwt}`;

  const res = await fetch(`${TEX_API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok && opts.throwOnError !== false) {
    throw new TexApiError(res.status, data);
  }
  return { status: res.status, data: data as T };
}
