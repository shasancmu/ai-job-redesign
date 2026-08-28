import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/orgs";
import { computeUsage, globalGate, type ModuleKind } from "@/lib/mechanics/promotion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE: Record<string, { table: string; owner: string }> = {
  roleplay: { table: "module_specs", owner: "owner_id" },
  interview: { table: "custom_modules", owner: "author_id" },
  negotiation: { table: "negotiation_specs", owner: "owner_id" },
  benchmark: { table: "benchmark_specs", owner: "owner_id" },
  analytical: { table: "analytical_specs", owner: "owner_id" },
  redesign: { table: "redesign_specs", owner: "owner_id" },
  live: { table: "live_specs", owner: "owner_id" },
};

// The author nominates their module for a wider tier. Personal (own classes) is
// the default and needs no nomination. Org is a director's call. Global must
// clear the automated gates before it can even be submitted.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const kind = String(body.kind || "") as ModuleKind;
  const slug = String(body.slug || "").toLowerCase();
  const tier = body.tier === "global" ? "global" : "org";
  const t = TABLE[kind];
  if (!t || !slug) return Response.json({ error: "unknown module" }, { status: 400 });

  const admin = createAdminClient();
  // Ownership check: you can only nominate your own module.
  const { data: row } = await admin.from(t.table).select(`${t.owner}`).eq("slug", slug).eq(t.owner, user.id).limit(1).maybeSingle();
  if (!row) return Response.json({ error: "You can only nominate a module you own." }, { status: 403 });

  const org = await getActiveOrg(user).catch(() => null);
  const orgId = org?.id || null;
  if (tier === "org" && !orgId) return Response.json({ error: "You need to be in an organization to promote org-wide." }, { status: 400 });

  const usage = await computeUsage(kind, slug);
  let readiness: any = { usage };
  if (tier === "global") {
    const evidence = { criticReady: !!body.criticReady, playtestSeparates: !!body.playtestSeparates };
    const gate = globalGate(usage, evidence);
    readiness = { usage, evidence, gate };
    if (!gate.ok) return Response.json({ error: "Not eligible for global yet.", missing: gate.missing }, { status: 422 });
  }

  const { error } = await admin.from("module_promotions").upsert(
    { kind, slug, owner_id: user.id, org_id: orgId, tier, status: "pending", readiness, decided_by: null, decided_at: null, note: null },
    { onConflict: "kind,slug,tier" }
  );
  if (error) return Response.json({ error: /does not exist|relation/i.test(error.message) ? "The promotions table isn't set up yet (run the migration)." : error.message }, { status: 500 });
  return Response.json({ ok: true, status: "pending", tier });
}
