import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Root: send signed-in users straight to the dashboard, otherwise to signup.
 * The dashboard itself is the marketing surface for now — a separate landing
 * page lives at getmetacognition.com.
 */
export default async function Home() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/signup");
}
