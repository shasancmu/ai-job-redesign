import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, workflowStepsAI } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ steps: null, reason: "ai-off" });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const steps = await withLanguage(await getUserLanguage(supabase, user.id), () =>
      workflowStepsAI(String(body.name || "").slice(0, 200), String(body.description || "").slice(0, 1500))
    );
    return Response.json({ steps });
  } catch (e: any) {
    return Response.json({ steps: null, reason: e?.message || "ai-error" }, { status: 502 });
  }
}
