// Generate a role-play spec in two passes instead of one.
//
// A role-play lands around 4,000 words, and nearly all of that weight is in
// `scenarios`: each one carries a hidden narrative, a private answer per probe,
// the tell and the foil. Asking for the whole spec in a single completion put
// the design and the scenarios in the same token budget, so the scenarios —
// written last — were what got truncated. Raising the cap only moves that
// ceiling; splitting the work removes it.
//
// Pass 1 designs the module and names the scenarios in a line each. Pass 2
// writes them out in full. Two benefits beyond the size: the progress the
// author sees is finally real, and a failure in pass 2 leaves a coherent module
// rather than nothing.
import { moduleCopilotStream, moduleCopilotAI } from "@/lib/ai";

export type StageEvent =
  | { type: "stage"; label: string }
  | { type: "progress"; chars: number; name: string };

const PASS1 = `Design the module and STOP before writing the scenarios in full.

Return the complete JSON object described above, with one exception: each entry
in "scenarios" carries ONLY { "id", "label", "gist" } — where "gist" is a single
sentence naming what is actually true in that scenario. Do not write "narrative",
"dimensions", "tell" or "foil" yet. Everything else (meta, objective, world,
roles, probes, selection, flow, rubric, report, guardrails) must be complete.

Plan 2 to 4 scenarios, including one genuinely ambiguous case.
Output ONLY the JSON object.`;

const pass2 = (design: string) => `Here is a module design whose scenarios are planned but not yet written:

${design}

Write those scenarios out in full. Return ONLY:
{ "scenarios": [ { "id", "label", "truth", "narrative", "dimensions": [ { "probe", "value", "stance", "answer" } ], "tell", "foil" } ] }

Keep the same ids and labels. Use the SAME probe keys as the design, with a
different value/stance/answer per scenario so the tell moves between them.
"narrative" is the hidden ground truth the learner never sees. "answer" is the
character's private truth and how they deliver it, consistent with the
behavioral contract in the design (never state a falsehood).
Output ONLY the JSON object.`;

// Fold the written scenarios back into the design, dropping the planning stubs.
function assemble(design: any, scenarios: any[]): any {
  const spec = { ...design };
  spec.scenarios = (scenarios || []).map((s: any) => {
    const { gist, ...rest } = s || {};
    return rest;
  });
  return spec;
}

export async function generateRoleplaySpecStaged(
  system: string,
  user: string,
  emit: (e: StageEvent) => void
): Promise<any> {
  let acc = 0;
  const named = (raw: string) => (raw.match(/"name"\s*:\s*"([^"\\]{2,80})"/) || [])[1] || "";
  let name = "";

  emit({ type: "stage", label: "Designing the situation and the character" });
  let seen = "";
  const design = await moduleCopilotStream(system, `${user}\n\n${PASS1}`, (delta) => {
    seen += delta; acc += delta.length;
    const n = named(seen); if (n) name = n;
    emit({ type: "progress", chars: acc, name });
  });
  if (!design || typeof design !== "object") return null;

  const planned = Array.isArray(design.scenarios) ? design.scenarios.length : 0;
  emit({
    type: "stage",
    label: planned
      ? `Writing the ${planned} hidden scenario${planned === 1 ? "" : "s"}`
      : "Writing the hidden scenarios",
  });

  const out = await moduleCopilotStream(system, pass2(JSON.stringify(design)), (delta) => {
    acc += delta.length;
    emit({ type: "progress", chars: acc, name });
  });

  const scenarios = Array.isArray(out?.scenarios) ? out.scenarios : Array.isArray(out) ? out : [];
  if (!scenarios.length) {
    // The design is sound and only the scenarios failed. Rather than throw away
    // a minute of good work, try once more without streaming; if that fails too,
    // hand back the design so the author still has something to edit.
    const retry = await moduleCopilotAI(system, pass2(JSON.stringify(design))).catch(() => null);
    const rs = Array.isArray((retry as any)?.scenarios) ? (retry as any).scenarios : [];
    return assemble(design, rs);
  }

  emit({ type: "stage", label: "Setting the grading and the guardrails" });
  return assemble(design, scenarios);
}
