import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "That's not me / remove me": delete this user's response and their self-added
// roster entry, so they can start over cleanly.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* default */
  }
  const cohort = String(body.cohort || "__untagged__");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  await admin
    .from("network_responses")
    .delete()
    .eq("cohort", cohort)
    .eq("user_id", user.id);

  const { data } = await admin
    .from("network_config")
    .select("roster")
    .eq("cohort", cohort)
    .maybeSingle();
  const roster = (data?.roster || []).filter((r: any) => r.owner !== user.id);
  await admin
    .from("network_config")
    .upsert({ cohort, roster, updated_at: new Date().toISOString() });

  return Response.json({ ok: true, roster });
}
