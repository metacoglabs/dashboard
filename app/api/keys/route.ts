import { NextResponse } from "next/server";
import { texFetch, TexApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const includeRevoked = url.searchParams.get("include_revoked") === "true";
  const path = `/me/api-keys${includeRevoked ? "?include_revoked=true" : ""}`;

  try {
    const { data } = await texFetch(path, { jwt: session.jwt });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof TexApiError) return NextResponse.json(e.payload, { status: e.status });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }

  try {
    const { data } = await texFetch("/me/api-keys", {
      method: "POST",
      jwt: session.jwt,
      body,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof TexApiError) return NextResponse.json(e.payload, { status: e.status });
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
