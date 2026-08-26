import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, capstoneReportAI } from "@/lib/ai";
import { tally, GAP_CENTS, LEVER_BY_KEY } from "@/lib/capstone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// HOST ONLY: grade the team. Deterministic facts from lib/capstone, softer
// dimensions and the reckoning from the AI.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });
  setFlow("capstone:report");

  const admin = createAdminClient();
  const { data: session } = await admin.from("capstone_sessions").select("id, host_id, transcript").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "not found" }, { status: 404 });

  const { data: picks } = await admin.from("capstone_picks").select("lever_key, selected, note, by_name").eq("session_id", session.id);
  const selected = (picks || []).filter((p: any) => p.selected);
  const keys = selected.map((p: any) => p.lever_key);
  const t = tally(keys);

  const transcript = (Array.isArray(session.transcript) ? session.transcript : [])
    .map((m: any) => `${m.role === "analyst" ? "ANALYST" : "CFO (" + (m.name || "team") + ")"}: ${m.content}`)
    .join("\n");

  const notes = selected
    .filter((p: any) => (p.note || "").trim())
    .map((p: any) => ({ role: `${p.by_name || "team"} on "${LEVER_BY_KEY[p.lever_key]?.label || p.lever_key}"`, note: p.note }));

  try {
    const report = await capstoneReportAI({
      facts: {
        gapCents: GAP_CENTS,
        centsAchieved: t.cents,
        hitsTarget: t.hitsTarget,
        indicted: t.indicted,
        illegalUsed: t.illegalUsed.map((k) => LEVER_BY_KEY[k]?.label || k),
        detection: t.detection,
        valueDestroyed: t.valueDestroyed,
        picked: t.picked.map((l) => ({ label: l.label, cents: l.cents, detection: l.detection, valueDestroyed: l.valueDestroyed, future: l.future, legal: l.legal })),
      },
      notes,
      transcript,
    });
    if (!report) return Response.json({ error: "Couldn't grade the capstone. Try again." }, { status: 502 });
    await admin.from("capstone_sessions").update({ report, phase: 4, status: "graded", updated_at: new Date().toISOString() }).eq("id", session.id);
    return Response.json({ report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
