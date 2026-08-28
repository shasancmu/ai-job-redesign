// Module drop-off instrumentation (superadmin only). Record where learners reach
// in a module run, and aggregate per-module completion. Best-effort: never
// affects a learner request.
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordModuleEvent(slug: string, kind: string | null, stage: string, userId?: string | null): Promise<void> {
  if (!slug) return;
  try { await createAdminClient().from("module_events").insert({ slug, kind: kind || null, stage, user_id: userId || null }); } catch { /* table missing / write failed -> skip */ }
}

export type DropoffRow = { slug: string; kind: string | null; starts: number; completes: number; completion: number };

// Per-module funnel, by DISTINCT users (so a refresh doesn't inflate starts).
// completion = users who ever completed / users who ever started.
export async function moduleDropoff(): Promise<DropoffRow[]> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("module_events").select("slug, kind, stage, user_id").limit(100000);
    const agg = new Map<string, { kind: string | null; starts: Set<string>; completes: Set<string> }>();
    for (const r of ((data as any[]) || [])) {
      const slug = String(r.slug);
      const m = agg.get(slug) || { kind: r.kind ?? null, starts: new Set<string>(), completes: new Set<string>() };
      const u = String(r.user_id || `anon-${Math.random()}`);
      if (r.stage === "start") m.starts.add(u);
      else if (r.stage === "complete") { m.completes.add(u); m.starts.add(u); } // a completer counts as a starter
      if (r.kind && !m.kind) m.kind = r.kind;
      agg.set(slug, m);
    }
    return [...agg.entries()]
      .map(([slug, v]) => ({ slug, kind: v.kind, starts: v.starts.size, completes: v.completes.size, completion: v.starts.size ? Math.round((v.completes.size / v.starts.size) * 100) : 0 }))
      .sort((a, b) => b.starts - a.starts);
  } catch { return []; }
}
