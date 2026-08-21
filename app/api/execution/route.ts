import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, executionPlanAI } from "@/lib/ai";

export const runtime = "nodejs";
import { setFlow } from "@/lib/aiflow";
export const dynamic = "force-dynamic";

// "How do we actually do this?" — a concrete execution plan for the AI tasks.
export async function POST(request: Request) {
  setFlow("execution:plan");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ text: null, reason: "ai-off" });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const aiTasks: string[] = Array.isArray(body.aiTasks)
    ? body.aiTasks.map((t: any) => String(t).slice(0, 200)).slice(0, 12)
    : [];
  if (aiTasks.length === 0) {
    return Response.json({ text: null, reason: "no-tasks" });
  }

  try {
    const text = await executionPlanAI(
      { title: String(body.jobTitle || "").slice(0, 200), description: String(body.jobDescription || "").slice(0, 1000) },
      aiTasks
    );
    return Response.json({ text });
  } catch (e: any) {
    return Response.json({ text: null, reason: e?.message || "ai-error" }, { status: 502 });
  }
}
