import { moduleByExercise } from "@/lib/modules";

// Spaced retrieval follow-ups. When a learner commits an if-then after a report
// (lib -> workspaces.canvas.reflection), it becomes a check-in that surfaces
// once its date arrives (or a few days after, if no date). The check-in asks
// them to RECALL the takeaway before reporting the outcome — spacing + retrieval.

export type FollowUp = { code: string; slug: string; moduleName: string; commitment: any; when: string };

type SB = { from: (t: string) => any };

const DUE_MS = 4 * 24 * 3600 * 1000; // fall back to ~4 days if no explicit date

export async function dueFollowUps(supabase: SB, userId: string): Promise<FollowUp[]> {
  const { data: wss } = await supabase
    .from("workspaces")
    .select("session_id, canvas")
    .eq("author_id", userId)
    .limit(400);

  const pending = ((wss as any[]) || []).filter((w) => {
    const r = w.canvas?.reflection;
    return r && r.commitment && !r.followedUpAt;
  });
  if (!pending.length) return [];

  const now = Date.now();
  const sessionIds = pending.map((w) => w.session_id).filter(Boolean);
  const { data: sess } = await supabase.from("sessions").select("id, code, exercise").in("id", sessionIds);
  const byId = new Map(((sess as any[]) || []).map((s) => [s.id, s]));

  const out: FollowUp[] = [];
  for (const w of pending) {
    const r = w.canvas.reflection;
    const dateDue = r.commitment.date ? new Date(r.commitment.date).getTime() <= now : false;
    const ageDue = r.at ? now - new Date(r.at).getTime() >= DUE_MS : false;
    if (!dateDue && !ageDue) continue;
    const s = byId.get(w.session_id);
    if (!s) continue;
    const m = moduleByExercise(s.exercise);
    if (!m) continue;
    out.push({ code: s.code, slug: m.slug, moduleName: m.name, commitment: r.commitment, when: r.at || r.commitment.date });
  }
  // Soonest first.
  out.sort((a, b) => (a.when < b.when ? -1 : 1));
  return out.slice(0, 4);
}
