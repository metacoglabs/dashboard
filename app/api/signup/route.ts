import { NextResponse } from "next/server";
import { texFetch, TexApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";

type SignupBody = { name?: string; org_id?: string };
type SignupResp = {
  org_id: string;
  user_id: string;
  api_key: string;
  key: { id: string; prefix: string; display_id: string | null; name: string | null };
};
type TokenResp = { access_token: string };

export async function POST(req: Request) {
  let body: SignupBody = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* allow empty body */
  }

  try {
    const { data: signup } = await texFetch<SignupResp>("/signup", {
      method: "POST",
      body,
    });

    // Immediately exchange the new API key for a JWT and stash it as a cookie
    // so the dev is "signed in" right after creating the org.
    const { data: tok } = await texFetch<TokenResp>("/auth/token-exchange", {
      method: "POST",
      body: { api_key: signup.api_key },
    });
    await setSession({ jwt: tok.access_token });

    // Surface the plaintext key once — the UI shows it on a "save this key" screen.
    return NextResponse.json(signup, { status: 201 });
  } catch (e) {
    if (e instanceof TexApiError) {
      return NextResponse.json(e.payload, { status: e.status });
    }
    return NextResponse.json({ error: "signup_failed", message: String(e) }, { status: 500 });
  }
}
