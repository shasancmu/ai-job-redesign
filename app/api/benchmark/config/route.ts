import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { DEFAULT_CONFIG, coerceConfig, configReady } from "@/lib/benchmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadConfig() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("benchmark_config")
    .select("data")
    .eq("id", "default")
    .maybeSingle();
  return coerceConfig(data?.data || DEFAULT_CONFIG);
}

// GET: questions WITHOUT answers, for taking the test.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let cfg;
  try {
    cfg = await loadConfig();
  } catch {
    cfg = DEFAULT_CONFIG;
  }
  return Response.json({
    title: cfg.title,
    timeLimitSec: cfg.timeLimitSec,
    total: cfg.questions.length,
    ready: configReady(cfg),
    questions: cfg.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options, // no `answer` field
    })),
  });
}

// POST: instructor saves the full config (with answers).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const cfg = coerceConfig(body);

  try {
    const admin = createAdminClient();
    await admin
      .from("benchmark_config")
      .upsert({ id: "default", data: cfg, updated_at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ error: e?.message || "save failed" }, { status: 500 });
  }
  return Response.json({ ok: true, ready: configReady(cfg) });
}
