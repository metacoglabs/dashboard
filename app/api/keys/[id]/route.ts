import { NextResponse } from "next/server";
import { texFetch, TexApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await texFetch(`/me/api-keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
      jwt: session.jwt,
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof TexApiError) return NextResponse.json(e.payload, { status: e.status });
    return NextResponse.json({ error: "revoke_failed" }, { status: 500 });
  }
}
