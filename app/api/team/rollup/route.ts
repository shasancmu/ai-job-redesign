import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, staffActiveOrg } from "@/lib/orgs";
import { gatherRollup } from "@/lib/understand";
import { rollupUnderstandingAI, AI_ENABLED } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A roll-up understanding of the viewer's whole span — a cohort for an
// instructor, programs for a program director, the school for a director.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const org = await staffActiveOrg(user);
  if (!org) return NextResponse.json({ error: "Not your organization." }, { status: 403 });

  const admin = createAdminClient();
  const role = await roleFor(user);
  const r = await gatherRollup(admin, org, role, user.id);
  if (!r.size) return NextResponse.json({ ok: true, empty: true, scope: r.scope });

  const fallback = {
    portrait: `${r.size} people in ${r.scope}.`,
    where: r.engagement.split("\n")[0] || "",
    needs: ["Make sure everyone is in a real cohort with a human who knows them."],
    watch: r.os.orphaned.length ? [`${r.os.orphaned.length} people are carried only by the system.`] : [],
    one_move: "Pick the person most at risk of drifting and write them a note today.",
  };

  let report: any = fallback;
  if (AI_ENABLED) {
    try {
      const ai = await rollupUnderstandingAI({ scope: r.scope, size: r.size, composition: r.composition, engagement: r.engagement, standouts: r.standouts });
      if (ai && typeof ai === "object" && ai.portrait) report = ai;
    } catch { /* keep fallback */ }
  }

  return NextResponse.json({ ok: true, report, scope: r.scope, size: r.size });
}
