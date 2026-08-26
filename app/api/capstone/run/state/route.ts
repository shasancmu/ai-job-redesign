import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { tally } from "@/lib/capstone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// INSTRUCTOR: live status of every team in a class run. Polled by the board.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!isAdmin(user.email)) return Response.json({ error: "Not allowed." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const runCode = String(body.runCode || "").toUpperCase();
  if (!runCode) return Response.json({ error: "missing run" }, { status: 400 });

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("capstone_sessions")
    .select("id, code, phase, status, report")
    .eq("run_code", runCode)
    .order("created_at");

  const teams = [];
  for (const s of sessions || []) {
    const [{ data: picks }, { data: members }] = await Promise.all([
      admin.from("capstone_picks").select("lever_key, selected").eq("session_id", s.id),
      admin.from("capstone_members").select("name, role").eq("session_id", s.id).order("created_at"),
    ]);
    const keys = (picks || []).filter((p: any) => p.selected).map((p: any) => p.lever_key);
    const t = tally(keys);
    teams.push({
      code: s.code,
      phase: s.phase,
      graded: !!s.report,
      members: members || [],
      cents: t.cents,
      hit: t.hitsTarget,
      indicted: t.indicted,
      detection: t.detection,
      valueDestroyed: t.valueDestroyed,
      levers: t.picked.map((l) => l.label),
      verdict: (s.report as any)?.market_verdict || null,
    });
  }
  return Response.json({ teams });
}
