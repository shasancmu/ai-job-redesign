// Gather a compact, readable digest of everything a cohort has done, so an
// instructor can chat with it. Server-only (service-role client passed in).
// Pulls participation, quiz/benchmark scores, role-play grades, and the
// qualitative outputs people wrote, then caps the size.

function clean(s: any, max = 600): string {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export type CohortDigest = { name: string; members: number; empty: boolean; text: string };

export async function gatherCohortDigest(admin: any, cohort: string): Promise<CohortDigest> {
  const code = String(cohort || "").trim().toUpperCase();
  const out: string[] = [];
  let name = code;
  let members = 0;

  // --- cohort meta + roster ---
  let classId: string | null = null;
  let moduleSlugs: string[] = [];
  try {
    const { data: klass } = await admin.from("classes").select("id, name, modules").eq("code", code).maybeSingle();
    if (klass) { name = klass.name || code; classId = klass.id; moduleSlugs = Array.isArray(klass.modules) ? klass.modules : []; }
    if (classId) {
      const { count } = await admin.from("class_members").select("user_id", { count: "exact", head: true }).eq("class_id", classId);
      members = count || 0;
    }
  } catch { /* ignore */ }

  // Names for attribution (the instructor is authorized to see their roster).
  const nameById = new Map<string, string>();
  async function loadNames(ids: string[]) {
    const need = ids.filter((id) => id && !nameById.has(id));
    if (!need.length) return;
    try {
      const { data } = await admin.from("profiles").select("id, display_name").in("id", [...new Set(need)]);
      for (const p of (data as any[]) || []) nameById.set(p.id, p.display_name || "A participant");
    } catch { /* ignore */ }
  }
  const nm = (id: any) => nameById.get(String(id)) || "A participant";

  out.push(`COHORT: "${name}" - ${members} member${members === 1 ? "" : "s"}.`);
  if (moduleSlugs.length) out.push(`Assigned modules: ${moduleSlugs.join(", ")}.`);

  // --- sessions: participation by module ---
  try {
    const { data: sessions } = await admin.from("sessions").select("exercise, status, host_id, guest_id, hidden").eq("cohort", code).limit(2000);
    const rows = ((sessions as any[]) || []).filter((s) => !s.hidden);
    if (rows.length) {
      const byEx: Record<string, { total: number; done: number }> = {};
      for (const s of rows) { const e = s.exercise || "unknown"; byEx[e] = byEx[e] || { total: 0, done: 0 }; byEx[e].total++; if (s.status === "done") byEx[e].done++; }
      out.push(`\nPARTICIPATION (${rows.length} sessions):`);
      for (const [e, c] of Object.entries(byEx)) out.push(`- ${e}: ${c.done}/${c.total} completed.`);
    }
  } catch { /* ignore */ }

  // --- quiz / benchmark scores ---
  try {
    const { data: bm } = await admin.from("benchmark_results").select("user_id, score, total").eq("cohort", code).limit(500);
    const rows = (bm as any[]) || [];
    if (rows.length) {
      await loadNames(rows.map((r) => r.user_id));
      const pct = rows.map((r) => (r.total ? r.score / r.total : 0));
      const avg = Math.round((pct.reduce((a, b) => a + b, 0) / pct.length) * 100);
      out.push(`\nQUIZZES / BENCHMARKS (${rows.length} attempts): average ${avg}% correct.`);
      for (const r of rows.slice(0, 30)) out.push(`- ${nm(r.user_id)}: ${r.score}/${r.total}.`);
    }
  } catch { /* ignore */ }

  // --- role-play grades ---
  try {
    const { data: rp } = await admin.from("roleplay_results").select("user_id, slug, scenario, score, report").eq("cohort", code).limit(300);
    const rows = (rp as any[]) || [];
    if (rows.length) {
      await loadNames(rows.map((r) => r.user_id));
      const scores = rows.map((r) => r.score).filter((s) => typeof s === "number");
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      out.push(`\nROLE-PLAYS (${rows.length} results${avg != null ? `, average score ${avg}` : ""}):`);
      for (const r of rows.slice(0, 25)) {
        const note = clean(r.report?.principle || r.report?.best_miss || r.report?.analyst_read, 220);
        out.push(`- ${nm(r.user_id)} on "${clean(r.scenario, 60)}" (${r.slug}): score ${r.score ?? "?"}${note ? `. Note: ${note}` : ""}.`);
      }
    }
  } catch { /* ignore */ }

  // --- qualitative: job/workflow redesign outputs (workspaces) ---
  try {
    const { data: ses } = await admin.from("sessions").select("id, host_id").eq("cohort", code).limit(1000);
    const sids = ((ses as any[]) || []).map((s) => s.id);
    if (sids.length) {
      const { data: ws } = await admin.from("workspaces").select("author_id, insight, strategic_outcome, final_description, new_job_description").in("session_id", sids.slice(0, 500)).limit(500);
      const rows = ((ws as any[]) || []).filter((w) => w.insight || w.strategic_outcome || w.final_description || w.new_job_description);
      if (rows.length) {
        await loadNames(rows.map((r) => r.author_id));
        out.push(`\nWHAT PEOPLE CONCLUDED (job/workflow redesigns, ${rows.length}):`);
        for (const w of rows.slice(0, 40)) {
          const bits = [clean(w.insight, 300), clean(w.strategic_outcome, 200), clean(w.final_description || w.new_job_description, 300)].filter(Boolean);
          if (bits.length) out.push(`- ${nm(w.author_id)}: ${bits.join(" | ")}`);
        }
      }
    }
  } catch { /* ignore */ }

  const text = out.join("\n");
  const empty = members === 0 && text.split("\n").length <= 2;
  return { name, members, empty, text: text.slice(0, 24000) };
}
