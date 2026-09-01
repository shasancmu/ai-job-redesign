import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEditOrgBranding, getActiveOrg, getOrgById } from "@/lib/orgs";
import { MODULES } from "@/lib/modules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(MODULES.map((m) => m.slug));
// The catalog a director picks from — the built-in modules (org entitlements
// gate these), newest sort left as declared, hidden ones excluded.
function catalog() {
  return MODULES.filter((m) => !(m as any).hidden).map((m) => ({ slug: m.slug, name: m.name, emoji: (m as any).emoji || "•", partner: (m as any).partner || "ai" }));
}

async function orgFor(user: any, orgId: string | null) {
  if (orgId) return orgId;
  const org = await getActiveOrg(user).catch(() => null);
  return org?.id || null;
}

// GET: the org's current module grant + the full catalog + member-browse setting.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const orgId = await orgFor(user, new URL(request.url).searchParams.get("org"));
  if (!orgId || !(await canEditOrgBranding(user, orgId))) return NextResponse.json({ error: "Not your organization." }, { status: 403 });

  const org = await getOrgById(orgId);
  const mods = (org as any)?.modules;
  return NextResponse.json({
    ok: true,
    all: !Array.isArray(mods) || mods.length === 0, // null/empty grant = all modules
    selected: Array.isArray(mods) ? mods.filter((s: any) => VALID.has(String(s))) : [],
    member_can_browse: (org as any)?.member_can_browse === true,
    catalog: catalog(),
  });
}

// POST: save the grant. `all` clears it (every module); otherwise store the
// chosen subset. Director of THIS org (or superadmin) only.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const orgId = await orgFor(user, String(body.orgId || "") || null);
  if (!orgId || !(await canEditOrgBranding(user, orgId))) return NextResponse.json({ error: "Not your organization." }, { status: 403 });

  let modules: string[] | null;
  if (body.all === true) modules = null; // all modules
  else {
    const picked: string[] = (Array.isArray(body.modules) ? body.modules : []).map((s: any) => String(s)).filter((s: string) => VALID.has(s));
    modules = Array.from(new Set<string>(picked));
    if (!modules.length) return NextResponse.json({ error: "Pick at least one module, or choose “All modules”." }, { status: 400 });
  }

  const admin = createAdminClient();
  const row: any = { modules };
  if (typeof body.member_can_browse === "boolean") row.member_can_browse = body.member_can_browse;
  const { error } = await admin.from("organizations").update(row).eq("id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
