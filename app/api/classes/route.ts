import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess, getActiveOrg } from "@/lib/orgs";
import { normalizeCode } from "@/lib/classes";
import { MODULES } from "@/lib/modules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(MODULES.map((m) => m.slug));

// GET: classes owned by this instructor.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const access = await facilitatorAccess(user);
  if (!access.ok) return new Response("Forbidden", { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ classes: [] });
  }
  // Scope to the active org (the header switcher), matching the facilitator hub:
  // a director/superadmin manages all of that org's cohorts, an instructor the
  // ones they own within it. Personal context shows your own org-less cohorts.
  const activeOrg = await getActiveOrg(user);
  let query = admin
    .from("classes")
    .select("id, code, name, modules, language, kind, allowed_emails, created_at")
    .order("created_at", { ascending: false });
  if (activeOrg) {
    query = query.eq("org_id", activeOrg.id);
    if (!(access.superadmin || access.orgIds.includes(activeOrg.id))) query = query.eq("owner_id", user.id);
  } else {
    query = query.eq("owner_id", user.id).is("org_id", null);
  }
  const { data } = await query;

  // member counts
  const classes = data || [];
  for (const c of classes) {
    const { count } = await admin
      .from("class_members")
      .select("user_id", { count: "exact", head: true })
      .eq("class_id", c.id);
    (c as any).members = count ?? 0;
  }
  return Response.json({ classes });
}

// POST: create or update a class (by code).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const access = await facilitatorAccess(user);
  if (!access.ok) return new Response("Forbidden", { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = normalizeCode(body.code);
  const name = String(body.name || "").trim();
  const modules = (Array.isArray(body.modules) ? body.modules : []).filter((s: string) =>
    VALID.has(s)
  );
  const language = String(body.language || "English").slice(0, 40) || "English";
  const kind = body.kind === "enterprise" ? "enterprise" : "teaching";
  const allowed_emails =
    kind === "enterprise" && Array.isArray(body.allowed_emails)
      ? [...new Set(body.allowed_emails.map((e: string) => String(e).trim().toLowerCase()).filter((e: string) => e.includes("@")))].slice(0, 5000)
      : [];
  if (!code || !name) return Response.json({ error: "code and name required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  // Don't let one instructor overwrite another's code.
  const { data: existing } = await admin
    .from("classes")
    .select("owner_id")
    .eq("code", code)
    .maybeSingle();
  if (existing && existing.owner_id !== user.id) {
    return Response.json({ error: "That code is taken." }, { status: 409 });
  }

  // Stamp the org so the cohort is filed under the org the creator is currently
  // IN (the header switcher), not just their first org. Falls back to their first
  // director/instructor org. Superadmin in Personal leaves it unscoped.
  const activeOrg = await getActiveOrg(user);
  const org_id =
    (activeOrg && (access.superadmin || access.orgIds.includes(activeOrg.id) || access.instructorOrgIds.includes(activeOrg.id))
      ? activeOrg.id
      : null) ||
    access.orgIds[0] ||
    access.instructorOrgIds[0] ||
    null;
  const { error } = await admin
    .from("classes")
    .upsert({ code, name, owner_id: user.id, modules, language, kind, allowed_emails, ...(org_id ? { org_id } : {}) }, { onConflict: "code" });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, code });
}

// DELETE: remove a class (and its memberships via cascade). Collected responses
// stay tagged by the code and remain in the results view.
export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!(await facilitatorAccess(user)).ok) return new Response("Forbidden", { status: 403 });

  const code = normalizeCode(new URL(request.url).searchParams.get("code") || "");
  if (!code) return Response.json({ error: "code required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }
  const { error } = await admin
    .from("classes")
    .delete()
    .eq("code", code)
    .eq("owner_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
