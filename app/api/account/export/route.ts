import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Right to data portability: download everything we hold about the signed-in
// user, as a single JSON file.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let db: any = supabase;
  try { db = createAdminClient(); } catch { /* fall back to the user client (RLS still returns their own rows) */ }
  const uid = user.id;

  const [profile, sessions, workspaces, classMembers, orgMembers, entitlements, network, benchmark] = await Promise.all([
    db.from("profiles").select("*").eq("id", uid).maybeSingle(),
    db.from("sessions").select("*").or(`host_id.eq.${uid},guest_id.eq.${uid}`),
    db.from("workspaces").select("*").eq("author_id", uid),
    db.from("class_members").select("*").eq("user_id", uid),
    db.from("org_members").select("*").eq("user_id", uid),
    db.from("entitlements").select("*").eq("user_id", uid),
    db.from("network_responses").select("*").eq("user_id", uid),
    db.from("benchmark_results").select("*").eq("user_id", uid),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: (user as any).created_at },
    profile: profile.data ?? null,
    sessions: sessions.data ?? [],
    workspaces: workspaces.data ?? [],
    class_members: classMembers.data ?? [],
    org_members: orgMembers.data ?? [],
    entitlements: entitlements.data ?? [],
    network_responses: network.data ?? [],
    benchmark_results: benchmark.data ?? [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="superadditive-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
