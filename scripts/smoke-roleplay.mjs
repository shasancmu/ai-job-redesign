#!/usr/bin/env node
// ============================================================================
// smoke-roleplay.mjs — build a role-play module end to end and check it's usable.
//
// Every failure in this flow so far only showed up under a real two-minute
// generation, and each one had to be caught by hand in a browser: the spec
// truncating at the token cap, a parse failure kicking off a second generation
// that could never finish, the draft review displaying an internal token where
// the hidden truth should be. None of them are visible to a typecheck or a
// build. This runs the real thing and asserts on what comes back.
//
// It calls the AI directly with the same prompts the route uses — read out of
// the source, not copied, so a prompt change is exercised rather than missed.
// No browser, no auth, no deploy.
//
//   AI_API_KEY=... node scripts/smoke-roleplay.mjs        (reads .env.local too)
//     [--intent="..."]   describe a different module
//     [--json]           machine-readable result, for CI
//
// Exits non-zero if anything a real author would notice is wrong.
// ============================================================================
import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const intentArg = (args.find((a) => a.startsWith("--intent=")) || "").replace("--intent=", "");

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
if (!AI_KEY) { console.error("Set AI_API_KEY (or put it in .env.local)."); process.exit(1); }
const IS_ANTHROPIC = BASE.includes("anthropic.com");

// ---- the real prompts, read from source so they can't drift ----------------
function literal(file, name) {
  const src = readFileSync(file, "utf8");
  const m = src.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
  if (!m) { console.error(`Couldn't find \`${name}\` in ${file} — the smoke test would be checking a stale prompt.`); process.exit(2); }
  return m[1];
}
const ROUTE = "app/api/mechanics/copilot/route.ts";
const STAGES = "lib/mechanics/specStages.ts";
const SCHEMA = literal(ROUTE, "SCHEMA");
const SYSTEM = literal(ROUTE, "SYSTEM").replace("${SCHEMA}", SCHEMA);
const PASS1 = literal(STAGES, "PASS1");

const INTENT = intentArg || "A ward manager questions a night nurse about a medication error. The hidden cause is a rota change that left one nurse covering two wards. Grade whether the learner finds the system cause rather than blaming the individual.";

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
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
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

// ---- checks: each one is a bug this flow actually shipped ------------------
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok, detail }); return !!ok; };
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

async function main() {
  const t0 = Date.now();

  // Pass 1 — the design.
  const design = parseJson(await complete(SYSTEM, `${INTENT}\n\n${PASS1}`));
  check("pass 1 returns parseable JSON", design, design ? "" : "truncated or non-JSON — the failure that shipped as 'Couldn't build a draft'");
  if (!design) return finish(t0);

  check("has a learning objective", design.objective?.goal, design.objective?.goal || "missing");
  check("has a character with a behavioural contract",
    (design.roles || []).some((r) => words(r.behavior) > 15),
    `${(design.roles || []).length} roles`);
  check("has probes for the learner to pull on", (design.probes || []).length >= 3, `${(design.probes || []).length} probes`);
  check("plans 2–4 scenarios", (design.scenarios || []).length >= 2 && (design.scenarios || []).length <= 4,
    `${(design.scenarios || []).length} planned`);

  // The verdict is what the learner actually commits to. The review showed only
  // a phase title here for weeks, because nothing asserted on the options.
  const verdict = (design.flow || []).flatMap((p) => p.verdict || []);
  check("the learner is asked to make a call with real options",
    verdict.some((f) => (f.options || []).length >= 2),
    verdict.map((f) => f.label).join(", ") || "no verdict fields");
  check("has rubric instructions", words(design.rubric?.instructions) > 20, `${words(design.rubric?.instructions)} words`);

  // Pass 2 — the scenarios, which carry most of the words and were what got cut.
  const pass2 = readFileSync(STAGES, "utf8").match(/const pass2 = \(design: string\) => `([\s\S]*?)`;/);
  if (!pass2) { console.error(`Couldn't find \`pass2\` in ${STAGES}.`); process.exit(2); }
  const p2 = pass2[1].replace("${design}", JSON.stringify(design));
  const out = parseJson(await complete(SYSTEM, p2));
  const scenarios = out?.scenarios || [];
  check("pass 2 returns scenarios", scenarios.length >= 2, `${scenarios.length} written`);

  // The hidden truth IS the module. `truth` is an internal token, so a narrative
  // of real length is the thing to assert — the review displayed the token for
  // weeks because nothing checked this.
  check("every scenario has a written hidden truth",
    scenarios.length > 0 && scenarios.every((s) => words(s.narrative) >= 15),
    scenarios.map((s) => `${s.id}:${words(s.narrative)}w`).join(" "));
  check("every scenario answers the probes",
    scenarios.length > 0 && scenarios.every((s) => (s.dimensions || []).length >= 2),
    scenarios.map((s) => `${s.id}:${(s.dimensions || []).length}`).join(" "));
  check("scenarios differ from each other",
    new Set(scenarios.map((s) => String(s.narrative || "").slice(0, 120))).size === scenarios.length,
    "identical narratives would make the module unplayable");

  // What the draft review will actually render, per lib/draftReview.ts.
  const spec = { ...design, scenarios };
  check("the review has substance to show at every step",
    words(spec.objective?.goal) > 3 &&
    spec.scenarios.every((s) => words(s.narrative) > 5) &&
    (spec.roles || []).some((r) => r.behavior) &&
    words(spec.rubric?.instructions) > 20 &&
    verdict.some((f) => (f.options || []).length >= 2),
    "each review step reads a different part of the spec");

  finish(t0, spec);
}

function finish(t0, spec) {
  const secs = Math.round((Date.now() - t0) / 1000);
  const failed = results.filter((r) => !r.ok);
  if (asJson) {
    console.log(JSON.stringify({ ok: failed.length === 0, seconds: secs, name: spec?.meta?.name, results }, null, 2));
  } else {
    console.log(`\n  ${spec?.meta?.name ? `“${spec.meta.name}”` : "(no module)"} · ${secs}s\n`);
    for (const r of results) console.log(`  ${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
    console.log(failed.length ? `\n  ${failed.length} failed\n` : `\n  all ${results.length} passed\n`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(`\n  smoke test errored: ${e?.message || e}\n`);
  process.exit(1);
});
