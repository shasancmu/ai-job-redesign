import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Add yourself to the roster (if not already present) and return your id.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const cohort = String(body.cohort || "__untagged__");
  const name = String(body.name || "").trim();
  if (!name) return Response.json({ error: "name required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  const { data } = await admin
    .from("network_config")
    .select("roster")
    .eq("cohort", cohort)
    .maybeSingle();
  const roster: { id: string; name: string }[] = data?.roster || [];

  const existing = roster.find(
    (r) => r.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (existing) return Response.json({ id: existing.id, roster });

  const id = `u${roster.length + 1}-${Math.floor(Math.random() * 1e6)}`;
  const next = [...roster, { id, name }];
  await admin
    .from("network_config")
    .upsert({ cohort, roster: next, updated_at: new Date().toISOString() });

  return Response.json({ id, roster: next });
}
