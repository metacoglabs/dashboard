import { NextResponse } from "next/server";
import { texFetch, TexApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";

type LoginBody = { api_key: string };
type TokenResp = { access_token: string };

export async function POST(req: Request) {
  let body: LoginBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body?.api_key || typeof body.api_key !== "string") {
    return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
  }

  try {
    const { data } = await texFetch<TokenResp>("/auth/token-exchange", {
      method: "POST",
      body: { api_key: body.api_key },
    });
    await setSession({ jwt: data.access_token });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof TexApiError) {
      return NextResponse.json(e.payload, { status: e.status });
    }
    return NextResponse.json({ error: "login_failed", message: String(e) }, { status: 500 });
  }
}
