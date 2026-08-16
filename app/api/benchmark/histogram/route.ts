import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BENCHMARK_TOTAL } from "@/lib/benchmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Score distribution (counts only, no names) for a cohort. Any signed-in user
// may read it — it's aggregate, non-identifying.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const cohort = new URL(request.url).searchParams.get("cohort") || "__untagged__";
  const untagged = cohort === "__untagged__";

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  let q = admin
    .from("benchmark_results")
    .select("user_id, score, created_at")
    .order("created_at", { ascending: false });
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { data } = await q;

  // Keep the latest attempt per user.
  const latest = new Map<string, number>();
  for (const r of data || []) {
    if (!latest.has(r.user_id)) latest.set(r.user_id, r.score);
  }

  const dist = Array.from({ length: BENCHMARK_TOTAL + 1 }, () => 0);
  let sum = 0;
  for (const score of latest.values()) {
    const s = Math.max(0, Math.min(BENCHMARK_TOTAL, score));
    dist[s]++;
    sum += s;
  }
  const n = latest.size;

  return Response.json({
    dist,
    n,
    total: BENCHMARK_TOTAL,
    mean: n ? Math.round((sum / n) * 10) / 10 : 0,
  });
}
