import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, deeperInterviewAI } from "@/lib/ai";

export const runtime = "nodejs";
import { setFlow } from "@/lib/aiflow";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  setFlow("job:probe");
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

  try {
    const text = await deeperInterviewAI({
      jobTitle: String(body.jobTitle || "").slice(0, 200),
      jobDescription: String(body.jobDescription || "").slice(0, 1000),
      notes: String(body.notes || "").slice(0, 3000),
    });
    return Response.json({ text });
  } catch (e: any) {
    return Response.json({ text: null, reason: e?.message || "ai-error" }, { status: 502 });
  }
}
