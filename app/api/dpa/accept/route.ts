import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A director (or superadmin) accepts the Data Processing Agreement for one of
// their organizations. Records who and when.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const orgId = String(body.orgId || "");
  const role = await roleFor(user);
  if (!orgId || !(role.superadmin || role.directorOrgIds.includes(orgId))) {
    return Response.json({ error: "Only a director of this organization can accept the DPA." }, { status: 403 });
  }

  const admin = createAdminClient();
  const name = (await admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle()).data?.display_name;
  const by = [name, user.email].filter(Boolean).join(" · ") || user.id;

  const { error } = await admin
    .from("organizations")
    .update({ dpa_accepted_at: new Date().toISOString(), dpa_accepted_by: String(by).slice(0, 200), updated_at: new Date().toISOString() })
    .eq("id", orgId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
