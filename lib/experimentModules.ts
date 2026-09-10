// Server-only: the full list of modules an experiment can target right now —
// built-in interview/canvas modules (matched by exercise key) plus authored
// modules from engines whose treatment + outcome are wired (matched by slug).
// Kept out of lib/experiments so that file stays safe to import in the client.
import { EXPERIMENT_CAPABLE_EXERCISES } from "@/lib/experiments";
import { moduleByExercise } from "@/lib/modules";
import { listRoleplayCatalog } from "@/lib/mechanics/store";
import { listNegCatalog } from "@/lib/mechanics/negStore";
import { listAnalyticalCatalog } from "@/lib/mechanics/analyticalStore";
import { listNewsCatalog } from "@/lib/mechanics/newsStore";

export type ExperimentFlow = { key: string; label: string; kind: string };

export async function listExperimentModules(admin?: any): Promise<ExperimentFlow[]> {
  const builtin: ExperimentFlow[] = EXPERIMENT_CAPABLE_EXERCISES.map((ex) => {
    const m = moduleByExercise(ex);
    // Group the built-ins by their real kind so the dropdown reads sensibly.
    const kind = ["negotiation", "haggle", "raise", "vendor-deal", "lease"].includes(ex) ? "Negotiation"
      : ["earnings-call", "hot-seat", "star-hire"].includes(ex) ? "Hidden-truth sim" : "Interview";
    return { key: ex, label: m?.name || ex, kind };
  });

  // Authored modules — the flow key is the module slug. Each engine's own catalog.
  const authored: ExperimentFlow[] = [];
  const add = async (fn: () => Promise<any[]>, kind: string) => {
    try { for (const r of (await fn()) || []) authored.push({ key: r.slug, label: r.name || r.slug, kind }); } catch { /* skip */ }
  };
  await Promise.all([
    add(() => listRoleplayCatalog(), "Role-play"),
    add(() => listNegCatalog(), "Negotiation"),
    add(() => listAnalyticalCatalog(), "Analytical"),
    add(() => listNewsCatalog(), "In the News"),
  ]);

  return [...builtin, ...authored].sort((a, b) => (a.kind + a.label).localeCompare(b.kind + b.label));
}
