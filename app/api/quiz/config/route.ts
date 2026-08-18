import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CONFIG, coerceConfig, configReady } from "@/lib/benchmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: the shared question set WITHOUT answers, for anonymous takers. Reuses
// the same benchmark_config the instructor edits. Answers never leave the server.
export async function GET() {
  let cfg = DEFAULT_CONFIG;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("benchmark_config").select("data").eq("id", "default").maybeSingle();
    cfg = coerceConfig(data?.data || DEFAULT_CONFIG);
  } catch {
    cfg = DEFAULT_CONFIG;
  }
  return Response.json({
    title: cfg.title,
    timeLimitSec: cfg.timeLimitSec,
    total: cfg.questions.length,
    ready: configReady(cfg),
    questions: cfg.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })), // no answer
  });
}
