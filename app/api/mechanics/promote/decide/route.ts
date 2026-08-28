import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A director decides ORG promotions for their org; a curator (superadmin) decides
// GLOBAL promotions and can demote. Authority is checked here, then the write
// goes through the service role.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const id = String(body.id || "");
  const decision = ["approved", "rejected", "demoted"].includes(body.decision) ? body.decision : null;
  if (!id || !decision) return Response.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: row } = await admin.from("module_promotions").select("*").eq("id", id).maybeSingle();
  if (!row) return Response.json({ error: "not found" }, { status: 404 });

  const role = await roleFor(user);
  const isCurator = role.superadmin;
  const isDirectorOfOrg = row.org_id && role.directorOrgIds.includes(row.org_id);
  const authorized = row.tier === "global" ? isCurator : (isCurator || isDirectorOfOrg);
  if (!authorized) return Response.json({ error: "Not authorized to decide this." }, { status: 403 });

  const { error } = await admin.from("module_promotions").update({ status: decision, note: String(body.note || "").slice(0, 500) || null, decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, status: decision });
}
