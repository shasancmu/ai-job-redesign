import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEditOrgBranding, getActiveOrg } from "@/lib/orgs";
import { getOrgAiStatus } from "@/lib/orgAi";
import { setAiProvider } from "@/lib/aiProvider";
import { aiHealthCheck } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Director-managed BYO AI provider for an org. GET returns status WITHOUT the key.
// POST save updates config (the key is only written when supplied, so it's never
// echoed back and clearing the field doesn't wipe it). POST test verifies the
// endpoint answers. Gated to a director of THAT org (or superadmin).
async function orgFor(user: any, orgId: string | null) {
  if (orgId) return orgId;
  const org = await getActiveOrg(user).catch(() => null);
  return org?.id || null;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const orgId = await orgFor(user, new URL(request.url).searchParams.get("org"));
  if (!orgId || !(await canEditOrgBranding(user, orgId))) return NextResponse.json({ error: "Not your organization." }, { status: 403 });
  return NextResponse.json({ ok: true, status: await getOrgAiStatus(orgId) });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const orgId = await orgFor(user, String(body.orgId || "") || null);
  if (!orgId || !(await canEditOrgBranding(user, orgId))) return NextResponse.json({ error: "Not your organization." }, { status: 403 });

  const admin = createAdminClient();
  const baseUrl = String(body.base_url || "").trim();
  const model = String(body.model || "").trim();
  const lowModel = String(body.low_model || "").trim();
  const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";

  if (body.action === "test") {
    // Use the supplied key, else the stored one — so you can re-test without re-typing.
    let key = apiKey;
    if (!key) { const { data } = await admin.from("org_ai_config").select("api_key").eq("org_id", orgId).maybeSingle(); key = (data as any)?.api_key || ""; }
    if (!baseUrl || !model || !key) return NextResponse.json({ ok: false, error: "Need a base URL, a model, and a key to test." });
    setAiProvider({ orgId, baseUrl, apiKey: key, model });
    try {
      const out = await aiHealthCheck();
      if (out && out.trim()) return NextResponse.json({ ok: true, reply: out.trim().slice(0, 60) });
      return NextResponse.json({ ok: false, error: "The endpoint answered but returned nothing." });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message?.slice(0, 300) || "Couldn't reach the endpoint." });
    }
  }

  // Save. Update the key only when a new one is supplied.
  const row: any = { org_id: orgId, enabled: body.enabled === true, base_url: baseUrl || null, model: model || null, low_model: lowModel || null, updated_by: user.id, updated_at: new Date().toISOString() };
  if (apiKey) row.api_key = apiKey;
  const { error } = await admin.from("org_ai_config").upsert(row, { onConflict: "org_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: await getOrgAiStatus(orgId) });
}
