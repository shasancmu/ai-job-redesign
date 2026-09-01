import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { staffActiveOrg } from "@/lib/orgs";
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

  const admin = createAdminClient();
  const u = await gatherUnderstanding(admin, org, userId);
  if (!u) return NextResponse.json({ error: "That person isn't in your school." }, { status: 404 });

  const inputs = briefInputs(u);

  // Fallback brief (also when AI is off) — plain, grounded, never guessing.
  const fallback = {
    who: u.who.segmentLabel ? `${u.person.name} told us they're ${u.who.segmentLabel.replace(/^I'm /, "").toLowerCase()}${u.who.studyField ? `, studying ${u.who.studyField}` : ""}.` : `We don't know much about ${u.person.name} yet — they haven't filled in who they are.`,
    here_for: u.who.goalLabel ? `They're here to ${u.who.goalLabel.toLowerCase()}.` : "",
    where: u.person.state.lastActiveDays == null ? "They haven't started yet." : `${u.person.timeline.filter((t) => t.done).length} module(s) finished; last active ${u.person.state.lastActiveDays} days ago.`,
    needs: u.recommended.map((r) => `Might point them to “${r.name}”`),
    one_thing: "Send them a short personal note — ask what brought them here and what they're hoping to get out of it.",
  };

  let brief: any = fallback;
  if (AI_ENABLED) {
    try {
      const ai = await understandPersonAI({ name: u.person.name, orgName: org.name, who: inputs.who, journey: inputs.journey, peers: inputs.peers });
      if (ai && typeof ai === "object" && ai.who) brief = ai;
    } catch { /* keep fallback */ }
  }

  return NextResponse.json({ ok: true, brief, recommended: u.recommended });
}
