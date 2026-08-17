#!/usr/bin/env node
// ============================================================================
// build-exposure.mjs — generate your OWN occupation AI-exposure table from
// PUBLIC O*NET tasks + the Eloundou et al. (2023) E0/E1/E2 rubric.
//
// This reproduces the paper's METHOD on public data; it copies no third-party
// dataset. Output numbers are yours and citable.
//
// Steps:
//   1. Download O*NET "Task Statements" (CC BY): https://www.onetcenter.org/database.html
//      (it's a tab-delimited text file with columns including
//       "O*NET-SOC Code", "Title", "Task").
//   2. Set the same AI env the app uses: AI_API_KEY [, AI_BASE_URL, AI_MODEL].
//   3. node scripts/build-exposure.mjs "path/to/Task Statements.txt"
//        [--only=11-2021,15-2051]   restrict to specific 6-digit SOC codes
//        [--out=lib/exposureData.ts]
//
// Writes lib/exposureData.ts with EXPOSURE_DATA: { "<soc6>": <exposure %> }.
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const only = (args.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean);
const out = (args.find((a) => a.startsWith("--out=")) || "--out=lib/exposureData.ts").replace("--out=", "");
if (!input) {
  console.error('Usage: node scripts/build-exposure.mjs "Task Statements.txt" [--only=11-2021,...] [--out=lib/exposureData.ts]');
  process.exit(1);
}

const AI_KEY = process.env.AI_API_KEY;
const BASE = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";
if (!AI_KEY) { console.error("Set AI_API_KEY (and optionally AI_BASE_URL, AI_MODEL)."); process.exit(1); }
const IS_ANTHROPIC = BASE.includes("anthropic.com");

// ---- parse the O*NET tab-delimited task file -------------------------------
const raw = readFileSync(input, "utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = lines[0].split("\t").map((h) => h.replace(/^"|"$/g, "").trim());
const iCode = header.findIndex((h) => /O\*NET-SOC Code/i.test(h));
const iTask = header.findIndex((h) => /^Task$/i.test(h));
if (iCode < 0 || iTask < 0) { console.error("Couldn't find 'O*NET-SOC Code' and 'Task' columns. Header:", header); process.exit(1); }

const bySoc = new Map(); // soc6 -> [task strings]
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split("\t");
  const code = (cols[iCode] || "").replace(/^"|"$/g, "").trim();
  const task = (cols[iTask] || "").replace(/^"|"$/g, "").trim();
  if (!code || !task) continue;
  const soc6 = code.slice(0, 7); // 11-2021.00 -> 11-2021
  if (only.length && !only.includes(soc6)) continue;
  if (!bySoc.has(soc6)) bySoc.set(soc6, []);
  bySoc.get(soc6).push(task);
}
console.error(`Parsed ${bySoc.size} occupations, ${[...bySoc.values()].reduce((s, a) => s + a.length, 0)} tasks.`);

// ---- classify a batch of tasks with the rubric -----------------------------
const SYSTEM = `You classify work tasks by their exposure to large language models, using the rubric of Eloundou et al. (2023). For EACH task return exactly one label:
- "E0": an LLM gives no or little time savings on the task.
- "E1": an LLM, used directly, cuts the time to do the task by at least half.
- "E2": an LLM plus additional software/tools built on top of it does most of the task.
Return STRICT JSON only: {"labels":["E0"|"E1"|"E2", ...]} — one label per input task, in the same order.`;

async function classify(tasks) {
  const body = {
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(tasks) }],
    max_tokens: 2048,
    temperature: 0,
    ...(IS_ANTHROPIC ? {} : { response_format: { type: "json_object" } }),
  };
  const res = await fetch(`${BASE}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const txt = data.choices?.[0]?.message?.content || "";
  const m = txt.match(/\{[\s\S]*\}/);
  const labels = m ? JSON.parse(m[0]).labels : [];
  return Array.isArray(labels) ? labels : [];
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// ---- score each occupation -------------------------------------------------
const table = {};
const socs = [...bySoc.keys()].sort();
for (let s = 0; s < socs.length; s++) {
  const soc = socs[s];
  const tasks = bySoc.get(soc);
  let e1 = 0, e2 = 0, n = 0;
  for (const c of chunk(tasks, 15)) {
    let labels = [];
    try { labels = await classify(c); } catch (e) { console.error(`  ${soc}: ${e.message}; retrying once`); try { labels = await classify(c); } catch { labels = []; } }
    c.forEach((_, i) => { const l = labels[i]; if (l === "E1") e1++; else if (l === "E2") e2++; if (["E0", "E1", "E2"].includes(l)) n++; });
  }
  if (n > 0) table[soc] = Math.round(((e1 + 0.5 * e2) / n) * 100);
  console.error(`[${s + 1}/${socs.length}] ${soc}: ${table[soc] ?? "—"}% (${n} tasks)`);
}

// ---- write the table -------------------------------------------------------
const ordered = Object.keys(table).sort().reduce((o, k) => ((o[k] = table[k]), o), {});
const gen = new Date().toISOString().slice(0, 10);
const body = `// GENERATED by scripts/build-exposure.mjs on ${gen}.
// Method: Eloundou et al. (2023) E0/E1/E2 rubric applied to public O*NET Task
// Statements (CC BY); β = (E1 + 0.5·E2)/all tasks, expressed as a percent.
// Regenerate any time; do not hand-edit.
export const EXPOSURE_DATA: Record<string, number> = ${JSON.stringify(ordered, null, 2)};

export const EXPOSURE_SOURCE = "O*NET Task Statements (CC BY) × Eloundou et al. (2023) rubric, self-generated ${gen}";
`;
writeFileSync(out, body);
console.error(`\nWrote ${Object.keys(ordered).length} occupations to ${out}.`);
