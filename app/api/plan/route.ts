import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, implementationPlanAI } from "@/lib/ai";

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
    const plan = await implementationPlanAI(
      {
        title: String(body.jobTitle || "").slice(0, 200),
        description: String(body.jobDescription || "").slice(0, 1200),
      },
      humanTasks,
      aiTasks
    );
    if (sessionId) {
      await supabase
        .from("workspaces")
        .update({ plan })
        .eq("session_id", sessionId)
        .eq("author_id", user.id);
    }
    return Response.json({ ok: true, plan });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't build the plan." }, { status: 502 });
  }
}
