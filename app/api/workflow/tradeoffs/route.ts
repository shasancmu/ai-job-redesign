import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, workflowTradeoffsAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ fields: null, reason: "ai-off" });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const fields = await workflowTradeoffsAI(
      String(body.name || "").slice(0, 200),
      String(body.description || "").slice(0, 1800),
      String(body.summary || "").slice(0, 600)
    );
    if (!fields || Object.keys(fields).length === 0) {
      return Response.json({ fields: null, reason: "empty" }, { status: 502 });
    }
    return Response.json({ fields });
  } catch (e: any) {
    return Response.json({ fields: null, reason: e?.message || "ai-error" }, { status: 502 });
  }
}
