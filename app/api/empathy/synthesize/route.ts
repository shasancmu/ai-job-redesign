import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, empathyAggregateAI, type EmpathyContext } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Owner-only: synthesize an aggregate read across all completed empathy
// interviews for one session, and cache it on the owner's workspace canvas.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = String(body.code || "");
  if (!code) return Response.json({ error: "Missing session." }, { status: 400 });

  const { data: session } = await supabase
    .from("sessions")
    .select("id, host_id, exercise")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id || session.exercise !== "empathy") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const { data: rows } = await supabase
    .from("empathy_interviews")
    .select("profile")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });
  const profiles = (rows || []).map((r: any) => r.profile).filter(Boolean);
  if (profiles.length === 0) return Response.json({ error: "No completed interviews yet." }, { status: 409 });

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, canvas")
    .eq("session_id", session.id)
    .eq("author_id", user.id)
    .maybeSingle();
  const canvas = (ws?.canvas as any) || {};
  const ctx: EmpathyContext = { business: canvas.business, offer: canvas.offer, audience: canvas.audience, goals: canvas.goals };

  try {
    let nudge = "";
    try { nudge = await experimentNudge(createAdminClient(), session.id, "empathy", "report"); } catch {}
    const aggregate = await empathyAggregateAI({ profiles, ctx, nudge });
    if (!aggregate) return Response.json({ error: "Couldn't synthesize. Try again." }, { status: 502 });
    if (ws?.id) {
      await supabase
        .from("workspaces")
        .update({ canvas: { ...canvas, aggregate, aggregateAt: new Date().toISOString(), aggregateN: profiles.length }, updated_at: new Date().toISOString() })
        .eq("id", ws.id);
    }
    return Response.json({ aggregate, n: profiles.length });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't synthesize." }, { status: 500 });
  }
}
