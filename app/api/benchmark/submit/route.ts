import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CONFIG, coerceConfig, scoreConfig } from "@/lib/benchmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Scores server-side (answers never travel to the client) and records the result.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const answers: Record<string, string> = body.answers || {};
  const sessionId: string | null = body.sessionId || null;
  const cohort: string | null = body.cohort || null;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  const { data } = await admin
    .from("benchmark_config")
    .select("data")
    .eq("id", "default")
    .maybeSingle();
  const cfg = coerceConfig(data?.data || DEFAULT_CONFIG);
  const score = scoreConfig(cfg, answers);
  const total = cfg.questions.length;

  await admin.from("benchmark_results").insert({
    session_id: sessionId,
    user_id: user.id,
    cohort,
    answers,
    score,
    total,
  });

  return Response.json({ score, total });
}
