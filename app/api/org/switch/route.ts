import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMyOrgs, ACTIVE_ORG_COOKIE, ACTIVE_ORG_PERSONAL } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Set the active white-label org (or clear it for "Personal"). Only orgs the
// user actually belongs to are accepted.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim().toLowerCase();

  // Personal is a real choice, not the absence of one: store a sentinel so it
  // sticks instead of defaulting back to the user's first org on the next load.
  if (!slug) {
    cookies().set(ACTIVE_ORG_COOKIE, ACTIVE_ORG_PERSONAL, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return Response.json({ ok: true, slug: null });
  }

  const mine = await getMyOrgs(user.id);
  if (!mine.some((m) => m.org.slug === slug)) return Response.json({ error: "Not a member of that org." }, { status: 403 });

  cookies().set(ACTIVE_ORG_COOKIE, slug, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return Response.json({ ok: true, slug });
}
