import { createClient } from "@/lib/supabase/server";
import { scoreConfig } from "@/lib/benchmark";
import { getBenchConfig } from "@/lib/mechanics/benchStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Score a benchmark server-side, so the answer key never reaches the client.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const cfg = await getBenchConfig(String(body.slug || ""));
  if (!cfg) return Response.json({ error: "unknown benchmark" }, { status: 400 });
  const answers = (body.answers && typeof body.answers === "object") ? body.answers : {};
  return Response.json({ score: scoreConfig(cfg, answers), total: cfg.questions.length });
}
