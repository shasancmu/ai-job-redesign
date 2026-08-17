import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, implementationPlanAI } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_KEYS = ["search", "structure", "think", "translate"];
const HUMAN_KEYS = ["lead", "own", "judge", "integrate"];

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const sessionId = body.sessionId ? String(body.sessionId) : null;
  const grid = body.grid || {};
  const humanTasks = HUMAN_KEYS.flatMap((k) => (grid[k] || []).map(String));
  const aiTasks = AI_KEYS.flatMap((k) => (grid[k] || []).map(String));
  if (humanTasks.length === 0 && aiTasks.length === 0) {
    return Response.json({ error: "Fill in the 2×4 first." }, { status: 400 });
  }

  try {
    const result = await withLanguage(await getUserLanguage(supabase, user.id), () =>
      implementationPlanAI(
        {
          title: String(body.jobTitle || "").slice(0, 200),
          description: String(body.jobDescription || "").slice(0, 1200),
        },
        humanTasks,
        aiTasks
      )
    );
    // `_raw` is for diagnosis only — never store it in the workspace.
    const { _raw, ...plan } = result;
    const empty =
      !plan.headline && !plan.summary && (plan.human?.length || 0) + (plan.ai?.length || 0) === 0;
    if (empty) {
      console.error("[plan] AI returned an unusable plan. Raw:", String(_raw || "").slice(0, 800));
      return Response.json(
        {
          error:
            "The AI returned an unusable plan — please try again. If it keeps happening, the model may be down.",
        },
        { status: 502 }
      );
    }

    if (sessionId) {
      const { error } = await supabase
        .from("workspaces")
        .update({ plan })
        .eq("session_id", sessionId)
        .eq("author_id", user.id);
      if (error) {
        // Almost always: the `plan` column is missing — re-run supabase/schema.sql.
        return Response.json(
          { error: `Couldn't save the plan (${error.message}). Re-run supabase/schema.sql.` },
          { status: 500 }
        );
      }
      // Confirm it actually landed (a missing/mismatched workspace row updates 0 rows silently).
      const { data: check } = await supabase
        .from("workspaces")
        .select("plan")
        .eq("session_id", sessionId)
        .eq("author_id", user.id)
        .maybeSingle();
      const stored = (check?.plan as any) || null;
      const storedEmpty =
        !stored ||
        (!stored.headline && !stored.summary && (stored.human?.length || 0) + (stored.ai?.length || 0) === 0);
      if (storedEmpty) {
        // Still return the plan so the caller can render it inline; just flag the save.
        return Response.json({ ok: true, plan, saved: false });
      }
    }
    return Response.json({ ok: true, plan, saved: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't build the plan." }, { status: 502 });
  }
}
