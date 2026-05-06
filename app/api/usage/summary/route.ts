import { NextResponse } from "next/server";
import { texFetch, TexApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const path = month
    ? `/usage/summary?month=${encodeURIComponent(month)}`
    : "/usage/summary";

  try {
    const { data } = await texFetch(path, { jwt: session.jwt });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof TexApiError) return NextResponse.json(e.payload, { status: e.status });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
