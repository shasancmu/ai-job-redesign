import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { VIEW_AS_COOKIE } from "@/lib/viewAs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Start/stop a superadmin "view as" session. Superadmin only.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperadmin(user))) {
    return NextResponse.json({ error: "Superadmin only." }, { status: 403 });
  }

  let body: any = {};
  try { body = await request.json(); } catch { /* default */ }

  if (body.clear) {
    cookies().set(VIEW_AS_COOKIE, "", { maxAge: 0, path: "/" });
    return NextResponse.json({ ok: true });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });
  if (email === (user.email || "").toLowerCase()) {
    return NextResponse.json({ error: "That's you." }, { status: 400 });
  }

  // Resolve the email → user id.
  const admin = createAdminClient();
  let targetId = "";
  for (let page = 1; page <= 20 && !targetId; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users || [];
    const found = users.find((u) => (u.email || "").toLowerCase() === email);
    if (found) targetId = found.id;
    if (users.length < 1000) break;
  }
  if (!targetId) return NextResponse.json({ error: "No user with that email." }, { status: 404 });

  // 2-hour, http-only, lax cookie — auto-expires so a forgotten session ends.
  cookies().set(VIEW_AS_COOKIE, targetId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 2 });
  return NextResponse.json({ ok: true });
}
