import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { staffActiveOrg } from "@/lib/orgs";
import { useOrgAi } from "@/lib/orgAi";
import { gatherUnderstanding, briefInputs } from "@/lib/understand";
import { understandPersonAI, AI_ENABLED } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The understanding brief for one person — loaded on demand by the profile page.
// Staff-only; gatherUnderstanding enforces the org boundary (returns null if the
// person isn't in this org).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: any = {};
  try { body = await request.json(); } catch { /* ignore */ }
  const userId = String(body.userId || "");
  if (!userId) return NextResponse.json({ error: "Missing person." }, { status: 400 });

  const org = await staffActiveOrg(user);
  if (!org) return NextResponse.json({ error: "Not your organization." }, { status: 403 });
  await useOrgAi(org.id); // route student data to the org's own models if configured

  const admin = createAdminClient();
  const u = await gatherUnderstanding(admin, org, userId);
  if (!u) return NextResponse.json({ error: "That person isn't in your school." }, { status: 404 });

  const force = body.force === true;

  // Cache-first: serve the stored reading unless a regenerate was asked for.
  // (Guarded so it degrades to always-generate if the table isn't migrated yet.)
  if (!force) {
    try {
      const { data: cached } = await admin.from("person_briefs").select("brief, updated_at").eq("org_id", org.id).eq("user_id", userId).maybeSingle();
      if (cached?.brief) return NextResponse.json({ ok: true, brief: cached.brief, recommended: u.recommended, cachedAt: cached.updated_at });
    } catch { /* table not migrated — fall through and generate */ }
  }

  const inputs = briefInputs(u);

  // Fallback (also when AI is off) — plain, grounded, never guessing.
  const fallback = {
    who: u.who.segmentLabel
      ? `${u.person.name} — ${u.who.segmentLabel.replace(/^I'm /, "").toLowerCase()}${u.who.goalLabel ? `, here to ${u.who.goalLabel.toLowerCase()}` : ""}.`
      : `Little is known about ${u.person.name} yet.`,
    blocker: "",
    unlock: "",
    needs: u.recommended.map((r) => `Might point them to “${r.name}”`),
    one_thing: "Send a short note and ask what they're really after.",
  };

  let brief: any = fallback;
  if (AI_ENABLED) {
    try {
      const ai = await understandPersonAI({ name: u.person.name, orgName: org.name, who: inputs.who, journey: inputs.journey, peers: inputs.peers, work: inputs.work, portrait: inputs.portrait });
      if (ai && typeof ai === "object" && ai.who) brief = ai;
    } catch { /* keep fallback */ }
  }

  // Store the reading so the next open is instant and stable.
  const now = new Date().toISOString();
  try {
    await admin.from("person_briefs").upsert({ org_id: org.id, user_id: userId, brief, generated_by: user.id, updated_at: now }, { onConflict: "org_id,user_id" });
  } catch { /* table not migrated — brief still returned, just not cached */ }

  return NextResponse.json({ ok: true, brief, recommended: u.recommended, cachedAt: now, generated: true });
}
