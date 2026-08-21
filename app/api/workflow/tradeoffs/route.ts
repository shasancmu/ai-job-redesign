import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, workflowTradeoffsAI } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
import { setFlow } from "@/lib/aiflow";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  setFlow("workflow:tradeoffs");
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
    const { fields, plan } = await withLanguage(await getUserLanguage(supabase, user.id), () =>
      workflowTradeoffsAI(String(body.name || "").slice(0, 200), String(body.description || "").slice(0, 1800), String(body.summary || "").slice(0, 600))
    );
    const hasFields = fields && Object.values(fields).some((v) => v);
    const hasPlan = plan && Object.values(plan).some((a: any) => a?.aim || a?.moves?.length);
    if (!hasFields && !hasPlan) {
      return Response.json({ fields: null, plan: null, reason: "empty" }, { status: 502 });
    }
    return Response.json({ fields, plan });
  } catch (e: any) {
    return Response.json({ fields: null, plan: null, reason: e?.message || "ai-error" }, { status: 502 });
  }
}
