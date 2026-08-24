// Resolve the question set for a quiz: the per-instance config stored on the
// quiz_sessions row if present, otherwise the shared benchmark_config singleton
// (which preserves the original single-quiz behavior). Server-only.

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CONFIG, coerceConfig, type BenchConfig } from "@/lib/benchmark";

export async function quizConfigForCode(code?: string): Promise<BenchConfig> {
  try {
    const admin = createAdminClient();
    if (code) {
      const { data: s } = await admin.from("quiz_sessions").select("config").eq("code", code.toUpperCase().trim()).maybeSingle();
      if ((s as any)?.config) return coerceConfig((s as any).config);
    }
    const { data } = await admin.from("benchmark_config").select("data").eq("id", "default").maybeSingle();
    return coerceConfig((data as any)?.data || DEFAULT_CONFIG);
  } catch {
    return DEFAULT_CONFIG;
  }
}
