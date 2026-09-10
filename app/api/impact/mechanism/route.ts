import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { AI_ENABLED, mechanismCodeAI } from "@/lib/ai";
import { flowLabel } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Superadmin-only: sample matched policy vs holdout conversations for a flow, pull
// their transcripts, and have the model name what concretely differs — the
// qualitative mechanism behind the numeric mediation.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const flow = String(body.flow || "");
  if (!flow) return Response.json({ error: "missing flow" }, { status: 400 });

  const admin = createAdminClient();
  // Pick recent finished conversations from each arm that actually have turns.
  const pick = async (holdout: boolean) => {
    const { data } = await admin.from("conversations")
      .select("conversation_id, dynamics")
      .eq("module", flow).eq("holdout", holdout).not("ended_at", "is", null)
      .order("updated_at", { ascending: false }).limit(24);
    return (data || []).filter((c: any) => (c.dynamics?.turns || 0) >= 2).slice(0, 8).map((c: any) => c.conversation_id);
  };
  let policyIds: string[] = [], holdoutIds: string[] = [];
  try { [policyIds, holdoutIds] = await Promise.all([pick(false), pick(true)]); } catch { /* table shape */ }
  if (policyIds.length < 2 || holdoutIds.length < 2) {
    return Response.json({ error: "Not enough completed conversations in both arms yet (need a few each of policy and holdout)." }, { status: 422 });
  }

  const transcript = async (id: string) => {
    const { data } = await admin.from("conversation_turns").select("speaker, text").eq("conversation_id", id).order("turn_index", { ascending: true }).limit(40);
    return (data || []).map((t: any) => `${t.speaker === "human" ? "Learner" : "AI"}: ${String(t.text || "").slice(0, 400)}`).join("\n").slice(0, 2000);
  };
  const [policy, holdout] = await Promise.all([
    Promise.all(policyIds.map(transcript)),
    Promise.all(holdoutIds.map(transcript)),
  ]);

  try {
    const coded = await mechanismCodeAI({ flowLabel: flowLabel(flow), policy: policy.filter(Boolean), holdout: holdout.filter(Boolean) });
    if (!coded) return Response.json({ error: "Couldn't code the transcripts. Try again." }, { status: 502 });
    return Response.json({ coded, sampled: { policy: policyIds.length, holdout: holdoutIds.length } });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Coding failed." }, { status: 500 });
  }
}
