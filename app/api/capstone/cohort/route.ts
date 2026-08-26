import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, capstoneCohortAI } from "@/lib/ai";
import { isAdmin } from "@/lib/admin";
import { tally } from "@/lib/capstone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// INSTRUCTOR: a cross-team synthesis of one cohort's capstone run.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!isAdmin(user.email)) return Response.json({ error: "Not allowed." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const cohort = String(body.cohort || "").toUpperCase();
  if (!cohort) return Response.json({ error: "missing cohort" }, { status: 400 });
  setFlow("capstone:cohort");

  const admin = createAdminClient();
  const { data: sessions } = await admin.from("capstone_sessions").select("id, code, report").eq("cohort", cohort).limit(60);
  if (!sessions || !sessions.length) return Response.json({ error: "No teams in this cohort yet." }, { status: 404 });

  const teams = [];
  for (const s of sessions) {
    const [{ data: picks }, { data: members }] = await Promise.all([
      admin.from("capstone_picks").select("lever_key, selected").eq("session_id", s.id),
      admin.from("capstone_members").select("name").eq("session_id", s.id),
    ]);
    const keys = (picks || []).filter((p: any) => p.selected).map((p: any) => p.lever_key);
    const t = tally(keys);
    teams.push({
      code: s.code,
      members: (members || []).map((m: any) => m.name).filter(Boolean),
      levers: t.picked.map((l) => l.label),
      cents: t.cents,
      hit: t.hitsTarget,
      indicted: t.indicted,
      detection: t.detection,
      valueDestroyed: t.valueDestroyed,
      marketVerdict: (s.report as any)?.market_verdict || "not graded",
    });
  }

  try {
    const synthesis = await capstoneCohortAI({ teams });
    if (!synthesis) return Response.json({ error: "Couldn't synthesize. Try again." }, { status: 502 });
    return Response.json({ synthesis });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
