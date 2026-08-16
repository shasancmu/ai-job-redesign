import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: the roster (names) for a cohort — needed to fill out the survey.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const cohort = new URL(request.url).searchParams.get("cohort") || "__untagged__";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("network_config")
      .select("roster")
      .eq("cohort", cohort)
      .maybeSingle();
    return Response.json({ roster: data?.roster || [] });
  } catch {
    return Response.json({ roster: [] });
  }
}

// POST: instructor sets/replaces the roster for a cohort.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const cohort = String(body.cohort || "__untagged__");
  const names: string[] = Array.isArray(body.names) ? body.names : [];
  const roster = names
    .map((n) => String(n).trim())
    .filter(Boolean)
    .map((name, i) => ({ id: `r${i + 1}`, name }));

  try {
    const admin = createAdminClient();
    await admin
      .from("network_config")
      .upsert({ cohort, roster, updated_at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ error: e?.message || "save failed" }, { status: 500 });
  }
  return Response.json({ ok: true, count: roster.length });
}
