import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, workflowAnalyzeAI } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ analysis: null, reason: "ai-off" });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const asIs = Array.isArray(body.steps)
    ? body.steps.map((s: any) => String(s?.text ?? s ?? "")).filter(Boolean).slice(0, 14)
    : [];

  try {
    const analysis = await withLanguage(await getUserLanguage(supabase, user.id), () =>
      workflowAnalyzeAI(String(body.name || "").slice(0, 200), String(body.description || "").slice(0, 1800), asIs)
    );
    if (!analysis.summary && analysis.opportunities.length === 0 && analysis.flow.length === 0) {
      return Response.json({ analysis: null, reason: "empty" }, { status: 502 });
    }
    return Response.json({ analysis });
  } catch (e: any) {
    return Response.json({ analysis: null, reason: e?.message || "ai-error" }, { status: 502 });
  }
}
