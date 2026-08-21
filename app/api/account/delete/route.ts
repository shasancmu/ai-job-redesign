import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Right to erasure: delete the signed-in user and all their data. Deleting the
// auth.users row cascades (FK on delete cascade) to profiles, sessions,
// workspaces, class/org memberships, entitlements, network + benchmark
// responses, and any live sessions or cohorts they hosted/owned. Pending
// email invites aren't FK-linked, so we clear those explicitly.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let admin;
  try { admin = createAdminClient(); } catch { return Response.json({ error: "Account deletion isn't available right now — contact support." }, { status: 500 }); }

  const email = (user.email || "").toLowerCase();
  try {
    if (email) await admin.from("org_invites").delete().eq("email", email);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't delete the account." }, { status: 500 });
  }

  try { await supabase.auth.signOut(); } catch {}
  return Response.json({ ok: true });
}
