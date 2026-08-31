import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, explainAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// ExplainAI — translate one abstract into plain-language framings for policymakers,
// industry, cross-disciplinary researchers, and the public.
export async function POST(request: Request) {
  setFlow("explain-ai");
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const abstract = String(body.abstract || "").trim().slice(0, 6000);
  const title = String(body.title || "").trim().slice(0, 300);
  if (abstract.length < 80) return Response.json({ error: "Paste the research as an abstract (a few sentences)." }, { status: 400 });

  try {
    const read = await explainAI({ abstract, title });
    if (!read) return Response.json({ error: "Couldn't write the translation. Try again." }, { status: 502 });
    return Response.json({ read, title });
  } catch (e: any) {
    return Response.json({ error: e?.message || "ExplainAI failed." }, { status: 500 });
  }
}
