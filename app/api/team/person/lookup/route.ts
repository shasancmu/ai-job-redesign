import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { staffActiveOrg } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Look up a person by email → their profile, but only if they're in the caller's
// school (the isolation boundary). Powers "click an email to understand someone".
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const email = (new URL(request.url).searchParams.get("email") || "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const org = await staffActiveOrg(user);
  if (!org) return NextResponse.json({ error: "Not your organization." }, { status: 403 });

  const admin = createAdminClient();

  // Resolve the email to an account.
  let userId = "";
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const list = data?.users || [];
    const hit = list.find((u) => (u.email || "").toLowerCase() === email);
    if (hit) { userId = hit.id; break; }
    if (list.length < 1000) break;
  }
  if (!userId) return NextResponse.json({ error: "No account with that email." }, { status: 404 });

  // They must be in this org's cohorts.
  const { data: classes } = await admin.from("classes").select("id").eq("org_id", org.id);
  const classIds = ((classes as any[]) || []).map((c) => c.id).slice(0, 4000);
  let isMember = false;
  if (classIds.length) {
    const { count } = await admin.from("class_members").select("user_id", { count: "exact", head: true }).eq("user_id", userId).in("class_id", classIds);
    isMember = (count || 0) > 0;
  }
  if (!isMember) return NextResponse.json({ error: "That person isn't in your school." }, { status: 404 });

  return NextResponse.json({ ok: true, id: userId });
}
