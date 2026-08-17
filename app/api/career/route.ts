import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, careerXrayAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const mode = body.mode === "jd" ? "jd" : "resume";
  const text = String(body.text || "").trim();
  if (text.length < 60) return Response.json({ error: "Paste a bit more text first." }, { status: 400 });

  try {
    const result = await careerXrayAI(mode, text, String(body.role || "").slice(0, 200), String(body.level || "").slice(0, 60));
    const { _raw, ...xray } = result;
    if (!xray.summary && (xray.tasks?.length || 0) === 0) {
      return Response.json({ error: "The analysis came back empty — try again." }, { status: 502 });
    }
    return Response.json({ ok: true, xray });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't run the analysis." }, { status: 502 });
  }
}
