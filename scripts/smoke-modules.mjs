#!/usr/bin/env node
// ============================================================================
// smoke-modules.mjs — build one module of every authorable format and check
// each is usable.
//
// Every failure in this flow surfaced only under a real generation someone had
// to sit and watch: a spec truncating at the token cap, a parse failure kicking
// off a second generation that could never finish, the draft review showing an
// internal token where the hidden truth belonged. A typecheck and a build see
// none of it.
//
// So this runs the real thing. It calls the AI directly with the same prompts
// the routes use — read out of the source, not copied, so a prompt change is
// exercised rather than missed. No browser, no auth, no deploy.
//
//   node scripts/smoke-modules.mjs                (all formats; reads .env.local)
//     [--only=occupations]        just the offline coverage check (no API key)
//     [--only=roleplay,benchmark]   just these
//     [--list]                      show the formats and exit
//     [--json]                      machine-readable, for CI
//
// Formats run in parallel; each takes one to two minutes. Exits non-zero if any
// check a real author would notice fails.
// ============================================================================
import { readFileSync, existsSync, rmSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const only = (args.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean);

// ---- env: match the app, which reads .env.local ----------------------------
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const AI_KEY = process.env.AI_API_KEY;
const BASE = process.env.AI_BASE_URL || "https://api.anthropic.com/v1";
const MODEL = process.env.AI_MODEL || "claude-sonnet-4-5";
const IS_ANTHROPIC = BASE.includes("anthropic.com");

// ---- helpers ---------------------------------------------------------------
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;
const list = (xs) => (Array.isArray(xs) ? xs : []);

// Read a template literal straight out of the source. Copying the prompts would
// let them drift; a rename should stop the run, not silently test a stale copy.
function literal(file, name) {
  const src = readFileSync(file, "utf8");
  const m = src.match(new RegExp("const " + name + " = `([\\s\\S]*?)`;"));
  if (!m) {
    console.error(`Couldn't find \`${name}\` in ${file} — this would be checking a stale prompt.`);
    process.exit(2);
  }
  return m[1];
}
function prompts(routeFile) {
  const schema = literal(routeFile, "SCHEMA");
  return literal(routeFile, "SYSTEM").replace("${SCHEMA}", schema);
}


// ---------------------------------------------------------------------------
// Occupation coverage — offline, instant, and the check that actually found the
// bugs. lib/exposureData.ts carries a computed AI-exposure figure for ~800
// occupations; the X-ray can only use one it can MATCH from a free-text job
// title. When matching reached forty of them, everyone else silently got a
// model-invented number displayed as if it were computed.
//
// Two spot-checks are not enough here: an 18-role sample passed while a third
// of the universe was mismatched, because aliases matched by substring
// ("underwriters" contains "writer") and the residual "Managers, All Other"
// bucket swallowed every named manager. Only enumerating the whole universe
// caught it. So this does both — the universe, and named roles that must land
// on a specific SOC code.
// ---------------------------------------------------------------------------

// Roles a person would actually type, and the occupation each must resolve to.
const ROLE_EXPECTATIONS = [
  ["Marketing Coordinator", "13-1161"], ["Marketing Manager", "11-2021"],
  ["Shift Supervisor", "51-1011"], ["Hospice Nurse", "29-1141"],
  ["Welder", "51-4121"], ["Dental Hygienist", "29-1292"],
  ["Paralegal", "23-2011"], ["High School Teacher", "25-2031"],
  ["Electrician", "47-2111"], ["Data Scientist", "15-2051"],
  ["Executive Assistant", "43-6011"], ["Customer Support Rep", "43-4051"],
  ["Barista", "35-3023"],
  // BLS folds CFOs into Chief Executives (11-1011); Financial Managers
  // (11-3031) is the tier below the C-suite. The matcher is right here — the
  // expectation in an earlier hand-check was wrong, and only looked correct
  // because that check fed body text that nudged it.
  ["Chief Financial Officer", "11-1011"],
  ["Software Engineer", "15-1252"],
];
const MIN_SELF_RETRIEVAL = 0.9; // 93.4% at time of writing

// Compile lib/onet.ts and import it, so this tests the shipping matcher rather
// than a copy of it that can drift.
async function loadMatcher() {
  const out = mkdtempSync(join(tmpdir(), "smoke-onet-"));
  try {
    execFileSync(process.execPath, [
      "node_modules/typescript/bin/tsc", "lib/onet.ts",
      "--outDir", out, "--module", "es2020", "--target", "es2020",
      "--moduleResolution", "node", "--skipLibCheck",
    ], { stdio: "pipe" });
    // tsc emits extensionless relative imports; Node's ESM loader needs them.
    for (const f of ["onet.js"]) {
      const p = join(out, f);
      writeFileSync(p, readFileSync(p, "utf8").replace(/from "\.\/([A-Za-z]+)"/g, 'from "./$1.js"'));
    }
    const onet = await import(pathToFileURL(join(out, "onet.js")).href);
    const skills = await import(pathToFileURL(join(out, "onetSkills.js")).href);
    const exposure = await import(pathToFileURL(join(out, "exposureData.js")).href);
    return { onet, skills, exposure, cleanup: () => rmSync(out, { recursive: true, force: true }) };
  } catch (e) {
    rmSync(out, { recursive: true, force: true });
    throw e;
  }
}

async function runOccupationCoverage() {
  const t0 = Date.now();
  let loaded;
  try {
    loaded = await loadMatcher();
  } catch (e) {
    return { id: "occupations", label: "Occupation coverage", seconds: 0, name: null,
      checks: [{ name: "matcher compiles", ok: false, detail: String(e?.message || e).slice(0, 120) }] };
  }
  const { onet, skills, exposure, cleanup } = loaded;
  try {
    const universe = Object.entries(skills.OCC_SKILLS)
      .filter(([code, m]) => m?.title && typeof exposure.EXPOSURE_DATA[code] === "number")
      .map(([code, m]) => ({ code, title: m.title }));

    let exact = 0;
    const strays = [];
    for (const o of universe) {
      const m = onet.matchOccupation(o.title, "");
      if (m?.code === o.code) exact++;
      else if (!m) strays.push(`${o.title} → (none)`);
    }
    const rate = universe.length ? exact / universe.length : 0;

    const wrong = [];
    for (const [role, code] of ROLE_EXPECTATIONS) {
      const m = onet.matchOccupation(role, "");
      if (m?.code !== code) wrong.push(`${role} → ${m ? m.code + " " + m.title : "(none)"}, wanted ${code}`);
    }

    // A benchmark is only usable if the matched occupation has a figure.
    let missingFigure = 0;
    for (const [role] of ROLE_EXPECTATIONS) {
      const m = onet.matchOccupation(role, "");
      if (m && onet.occupationExposure(m.code) == null) missingFigure++;
    }

    return {
      id: "occupations", label: "Occupation coverage",
      seconds: Math.round((Date.now() - t0) / 1000), name: `${universe.length} occupations`,
      checks: [
        ["matcher compiles and loads", true, ""],
        ["every occupation with a figure is reachable", universe.length >= 700, `${universe.length} in the index`],
        [`self-retrieval at or above ${Math.round(MIN_SELF_RETRIEVAL * 100)}%`, rate >= MIN_SELF_RETRIEVAL,
          `${exact}/${universe.length} (${(rate * 100).toFixed(1)}%)`],
        ["no occupation is unreachable entirely", strays.length === 0, strays.slice(0, 2).join("; ")],
        ["common job titles map to the right occupation", wrong.length === 0, wrong.slice(0, 2).join("; ")],
        ["every matched occupation has an exposure figure", missingFigure === 0, `${missingFigure} missing`],
      ].map(([name, ok, detail]) => ({ name, ok: !!ok, detail: detail == null ? "" : String(detail).slice(0, 110) })),
    };
  } finally {
    cleanup();
  }
}

// ---- the formats, and what "usable" means for each -------------------------
// Each check is a property an author would notice missing, and the last one in
// every list mirrors what lib/draftReview.ts reads, so the review can never
// render a step with nothing in it.
const FORMATS = [
  {
    id: "roleplay",
    label: "Role-play",
    route: "app/api/mechanics/copilot/route.ts",
    staged: true, // the only format generated in two passes
    intent:
      "A ward manager questions a night nurse about a medication error. The hidden cause is a rota change that left one nurse covering two wards. Grade whether the learner finds the system cause rather than blaming the individual.",
    checks: (s) => [
      ["has a learning objective", words(s.objective?.goal) > 3, s.objective?.goal],
      ["has a character with a behavioural contract", list(s.roles).some((r) => words(r.behavior) > 15), `${list(s.roles).length} roles`],
      ["has probes to pull on", list(s.probes).length >= 3, `${list(s.probes).length} probes`],
      ["has 2–4 scenarios", list(s.scenarios).length >= 2 && list(s.scenarios).length <= 4, `${list(s.scenarios).length}`],
      // `truth` is an internal token; the narrative is the thing an author judges.
      ["every scenario has a written hidden truth", list(s.scenarios).length > 0 && list(s.scenarios).every((x) => words(x.narrative) >= 15),
        list(s.scenarios).map((x) => `${x.id}:${words(x.narrative)}w`).join(" ")],
      ["every scenario answers the probes", list(s.scenarios).every((x) => list(x.dimensions).length >= 2),
        list(s.scenarios).map((x) => `${x.id}:${list(x.dimensions).length}`).join(" ")],
      ["scenarios differ from each other",
        new Set(list(s.scenarios).map((x) => String(x.narrative || "").slice(0, 120))).size === list(s.scenarios).length],
      ["the learner makes a call with real options",
        list(s.flow).flatMap((p) => list(p.verdict)).some((f) => list(f.options).length >= 2)],
      ["has rubric instructions", words(s.rubric?.instructions) > 20, `${words(s.rubric?.instructions)}w`],
    ],
  },
  {
    id: "interview",
    label: "Guided interview",
    route: "app/api/mechanics/interview-copilot/route.ts",
    intent:
      "An AI interviews a manager about a hiring plan they are actually working on, then drafts a filled-in scorecard for it, grounded in structured-interviewing research.",
    checks: (s) => [
      ["names what the learner brings", words(s.subject) > 1, s.subject],
      ["has a setup prompt", words(s.setupTitle) > 0 && words(s.setupPlaceholder) > 2],
      ["has an interviewer persona", words(s.persona) > 3, s.persona],
      ["has topics to draw out", list(s.topics).length >= 3, `${list(s.topics).length} topics`],
      ["produces a real artifact", list(s.sections).length >= 3, `${list(s.sections).length} sections`],
      ["every section is named and says what it holds", list(s.sections).every((x) => words(x.name) > 0 && words(x.contains) > 2)],
    ],
  },
  {
    id: "negotiation",
    label: "Negotiation",
    route: "app/api/mechanics/negotiation-copilot/route.ts",
    intent:
      "A hospital procurement lead negotiates a two-year imaging service contract with a vendor across price, response time, training, and term length.",
    checks: (s) => [
      ["sets the situation", words(s.scenario) > 25, `${words(s.scenario)}w`],
      ["names both sides", words(s.counterpartName) > 0 && words(s.youRole) > 0 && words(s.themRole) > 0],
      ["is multi-issue or an explicit single-price deal", ["multi-issue", "single-price"].includes(s.kind), s.kind],
      // Integrative trades only exist if the two sides value issues differently.
      ["has issues with payoffs on both sides",
        s.kind !== "multi-issue" || list(s.issues).every((i) => list(i.options).length >= 2 && list(i.options).every((o) => typeof o.you === "number" && typeof o.them === "number")),
        s.kind === "multi-issue" ? `${list(s.issues).length} issues` : "single-price"],
      ["has trades worth finding",
        s.kind !== "multi-issue" || list(s.issues).some((i) => {
          const you = list(i.options).map((o) => o.you), them = list(i.options).map((o) => o.them);
          return Math.max(...you) - Math.min(...you) !== Math.max(...them) - Math.min(...them);
        }),
        "at least one issue the sides weigh differently"],
      ["has a credible walk-away", s.kind !== "multi-issue" ? true : typeof s.yourBatna === "number", String(s.yourBatna ?? "n/a")],
    ],
  },
  {
    id: "benchmark",
    label: "Timed quiz",
    route: "app/api/mechanics/benchmark-copilot/route.ts",
    intent: "A short concept check on regression to the mean and base rates, for MBA students.",
    checks: (s) => [
      ["has a title the app will keep", words(s.title || s.name) > 0, s.title || s.name],
      ["has questions", list(s.questions).length >= 4, `${list(s.questions).length}`],
      ["every question is written", list(s.questions).every((q) => words(q.prompt) > 3)],
      ["every question has choices", list(s.questions).every((q) => list(q.options).length >= 3),
        list(s.questions).map((q) => list(q.options).length).join(",")],
      // A score means nothing if the wrong answers are throwaways.
      ["distractors are substantive",
        list(s.questions).every((q) => list(q.options).filter((o) => words(o.label || o) > 1).length >= 3)],
      ["has an answer key", list(s.questions).every((q) => !!q.answer)],
      ["is timed", typeof s.timeLimitSec === "number" && s.timeLimitSec > 60, `${Math.round((s.timeLimitSec || 0) / 60)}m`],
    ],
  },
  {
    id: "analytical",
    label: "Analytical instrument",
    route: "app/api/mechanics/analytical-copilot/route.ts",
    intent:
      "An AI-exposure X-ray of a job: paste a job description, break it into tasks, and score each None / Assisted / Automatable by today's AI.",
    checks: (s) => [
      ["names the subject and the unit", words(s.subject) > 0 && words(s.unitLabel) > 0, `${s.subject} → ${s.unitLabel}`],
      ["explains the decomposition", words(s.decompose) > 8, `${words(s.decompose)}w`],
      ["has an ordered scale", list(s.levels).length >= 3, `${list(s.levels).length} levels`],
      ["every level is labelled", list(s.levels).every((l) => words(l.label) > 0),
        list(s.levels).map((l) => l.label).join(" / ")],
      // Without a stated standard the scoring is just vibes.
      ["scores against a stated lens", words(s.lens) > 5, `${words(s.lens)}w`],
      ["has a setup prompt", words(s.setupLabel) > 0 && words(s.setupPlaceholder) > 2],
    ],
  },
  {
    id: "explainer",
    label: "Explainer",
    route: "app/api/mechanics/explainer-copilot/route.ts",
    intent: "A plain-language walkthrough of how a diffusion model generates an image, for non-technical managers.",
    checks: (s) => [
      ["names what it teaches", words(s.subject) > 1, s.subject],
      ["opens with a hook", words(s.intro) > 15, `${words(s.intro)}w`],
      ["has sections", list(s.sections).length >= 3, `${list(s.sections).length}`],
      ["every section is titled and written", list(s.sections).every((x) => words(x.title) > 0 && words(x.body) > 25),
        list(s.sections).map((x) => words(x.body) + "w").join(" ")],
      // An explainer that teaches everything teaches nothing.
      ["has one thing to remember", words(s.takeaway) > 4, s.takeaway],
    ],
  },
  {
    id: "newsframe",
    label: "In the News",
    route: "app/api/mechanics/newsframe-copilot/route.ts",
    intent: "Apply Porter's Five Forces to this week's stories about the semiconductor industry.",
    checks: (s) => [
      ["names the framework", words(s.framework) > 0, s.framework],
      ["says how to apply it", words(s.frameworkLogic) > 15, `${words(s.frameworkLogic)}w`],
      // Too narrow and there is no news; too broad and it isn't about anything.
      ["has a beat to pull stories from", words(s.topic) > 0, s.topic],
      ["has analysis fields", list(s.fields).length >= 3, `${list(s.fields).length} fields`],
      ["every field is labelled", list(s.fields).every((f) => words(f.label) > 0)],
      ["the learner commits to a judgement", list(s.verdict?.options).length >= 2, s.verdict?.label],
      ["says how to grade it", words(s.grading) > 10, `${words(s.grading)}w`],
    ],
  },
  {
    id: "redesign",
    label: "Paired redesign",
    route: "app/api/mechanics/redesign-copilot/route.ts",
    intent:
      "Two learners interview each other about a recurring meeting they run, then redesign each other's meeting across what only a human should lead and what AI can prepare.",
    checks: (s) => [
      ["names the subject partners bring", words(s.subject) > 0, s.subject],
      ["asks each learner for their own case", words(s.setupPrompt) > 8, `${words(s.setupPrompt)}w`],
      ["tells the interviewer what to draw out", words(s.interviewPrompt) > 10, `${words(s.interviewPrompt)}w`],
      ["has a redesign instrument", list(s.buckets).length >= 2, `${list(s.buckets).length} buckets`],
      ["every bucket is labelled", list(s.buckets).every((b) => words(b.label) > 0),
        list(s.buckets).map((b) => b.label).join(" / ")],
      ["frames the split", words(s.splitTitle) > 0 && words(s.splitIntro) > 5],
    ],
  },
];

if (args.includes("--list")) {
  console.log(`  ${"occupations".padEnd(12)} Occupation coverage  (offline, no API key)`);
  for (const f of FORMATS) console.log(`  ${f.id.padEnd(12)} ${f.label}${f.staged ? "  (two-pass)" : ""}`);
  process.exit(0);
}

// ---- one completion --------------------------------------------------------
async function complete(system, user, maxTokens = 16000) {
  const url = IS_ANTHROPIC ? `${BASE}/messages` : `${BASE}/chat/completions`;
  const headers = IS_ANTHROPIC
    ? { "Content-Type": "application/json", "x-api-key": AI_KEY, "anthropic-version": "2023-06-01" }
    : { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` };
  const body = IS_ANTHROPIC
    ? { model: MODEL, max_tokens: maxTokens, temperature: 0.5, system, messages: [{ role: "user", content: user }] }
    : { model: MODEL, max_tokens: maxTokens, temperature: 0.5, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return IS_ANTHROPIC ? (d.content?.[0]?.text || "") : (d.choices?.[0]?.message?.content || "");
}

function parseJson(raw) {
  const s = String(raw).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  for (const cand of [s, fence?.[1], s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)]) {
    if (!cand) continue;
    try { return JSON.parse(cand); } catch { /* next */ }
  }
  return null;
}

// The role-play is generated in two passes, because its scenarios carry most of
// the words. The test has to mirror that or it isn't testing what ships.
async function generate(fmt) {
  const system = prompts(fmt.route);
  if (!fmt.staged) return parseJson(await complete(system, fmt.intent));

  const pass1 = literal("lib/mechanics/specStages.ts", "PASS1");
  const design = parseJson(await complete(system, `${fmt.intent}\n\n${pass1}`));
  if (!design) return null;
  const src = readFileSync("lib/mechanics/specStages.ts", "utf8");
  const m = src.match(/const pass2 = \(design: string\) => `([\s\S]*?)`;/);
  if (!m) { console.error("Couldn't find `pass2` in lib/mechanics/specStages.ts."); process.exit(2); }
  const out = parseJson(await complete(system, m[1].replace("${design}", JSON.stringify(design))));
  return { ...design, scenarios: list(out?.scenarios).length ? out.scenarios : list(design.scenarios) };
}

async function run(fmt) {
  const t0 = Date.now();
  try {
    const spec = await generate(fmt);
    const checks = spec
      ? [["returns parseable JSON", true, ""], ...fmt.checks(spec)]
      : [["returns parseable JSON", false, "truncated or non-JSON"]];
    return {
      id: fmt.id, label: fmt.label, seconds: Math.round((Date.now() - t0) / 1000),
      name: spec?.meta?.name || spec?.name || spec?.title || null,
      checks: checks.map(([name, ok, detail]) => ({ name, ok: !!ok, detail: detail == null ? "" : String(detail).slice(0, 90) })),
    };
  } catch (e) {
    return { id: fmt.id, label: fmt.label, seconds: Math.round((Date.now() - t0) / 1000), name: null,
      checks: [{ name: "generation completed", ok: false, detail: e?.message || String(e) }] };
  }
}

// ---- go --------------------------------------------------------------------
const chosen = only.length ? FORMATS.filter((f) => only.includes(f.id)) : FORMATS;
const wantCoverage = !only.length || only.includes("occupations");
if (!chosen.length && !wantCoverage) { console.error(`Nothing matched --only. Try --list.`); process.exit(1); }
// The coverage check is offline and instant, so it never needs a key — and it
// runs first, because a broken matcher is cheaper to find than a slow one.
if (chosen.length && !AI_KEY) { console.error("Set AI_API_KEY (or put it in .env.local)."); process.exit(1); }
if (!asJson && chosen.length) console.log(`\n  Building ${chosen.length} module${chosen.length === 1 ? "" : "s"} against ${MODEL}. One to two minutes.\n`);

const reports = [
  ...(wantCoverage ? [await runOccupationCoverage()] : []),
  ...(await Promise.all(chosen.map(run))),
];
const failed = reports.filter((r) => r.checks.some((c) => !c.ok));

if (asJson) {
  console.log(JSON.stringify({ ok: failed.length === 0, reports }, null, 2));
} else {
  for (const r of reports) {
    const bad = r.checks.filter((c) => !c.ok).length;
    console.log(`  ${bad ? "✗" : "✓"} ${r.label}${r.name ? ` — “${r.name}”` : ""} · ${r.seconds}s`);
    for (const c of r.checks) if (!c.ok || process.env.VERBOSE) console.log(`      ${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  }
  const total = reports.reduce((n, r) => n + r.checks.length, 0);
  console.log(failed.length
    ? `\n  ${failed.length} of ${reports.length} failed\n`
    : `\n  all ${reports.length} passed (${total} checks)\n`);
}
process.exit(failed.length ? 1 : 0);
