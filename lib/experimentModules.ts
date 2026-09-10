// Server-only: the full list of modules an experiment can target right now —
// built-in interview/canvas modules (matched by exercise key) plus authored
// modules from engines whose treatment + outcome are wired (matched by slug).
// Kept out of lib/experiments so that file stays safe to import in the client.
import { EXPERIMENT_CAPABLE_EXERCISES } from "@/lib/experiments";
import { moduleByExercise } from "@/lib/modules";
import { listRoleplayCatalog } from "@/lib/mechanics/store";

export type ExperimentFlow = { key: string; label: string; kind: string };

export async function listExperimentModules(admin?: any): Promise<ExperimentFlow[]> {
  const builtin: ExperimentFlow[] = EXPERIMENT_CAPABLE_EXERCISES.map((ex) => ({
    key: ex, label: moduleByExercise(ex)?.name || ex, kind: "Interview",
  }));

  // Authored role-play modules — the flow key is the module slug.
  let roleplay: ExperimentFlow[] = [];
  try {
    const rp = await listRoleplayCatalog();
    roleplay = (rp || []).map((r: any) => ({ key: r.slug, label: r.name || r.slug, kind: "Role-play" }));
  } catch { /* catalog unavailable — skip */ }

  return [...builtin, ...roleplay].sort((a, b) => (a.kind + a.label).localeCompare(b.kind + b.label));
}
