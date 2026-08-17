#!/usr/bin/env node
// ============================================================================
// build-messages.mjs — translate the UI message file into another locale via
// the configured LLM. Reproduces the Tier-1 pattern for static chrome.
//
//   node scripts/build-messages.mjs <Language> <locale-code>
//   e.g.  node scripts/build-messages.mjs Spanish es
//         node scripts/build-messages.mjs Arabic  ar
//
// Uses AI_API_KEY [, AI_BASE_URL, AI_MODEL]. Reads messages/en.json, writes
// messages/<code>.json. Machine translation — review before shipping.
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";

const [language, code] = process.argv.slice(2);
if (!language || !code) {
  console.error("Usage: node scripts/build-messages.mjs <Language> <locale-code>");
  process.exit(1);
}
const BASE = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";
const KEY = process.env.AI_API_KEY;
if (!KEY) { console.error("Set AI_API_KEY (and optionally AI_BASE_URL, AI_MODEL)."); process.exit(1); }
const IS_ANTHROPIC = BASE.includes("anthropic.com");

const en = readFileSync("messages/en.json", "utf8");

const SYSTEM = `You are a professional software localizer. Translate the VALUES of this JSON UI dictionary into ${language} for a professional web app.
Rules:
- Keep every KEY exactly as-is (do not translate keys).
- Keep placeholders like {name}, {n}, {code} EXACTLY, in place.
- Keep leading UI symbols/arrows (▸ ▾ ✓ →) in place; mirror arrows naturally if the language is right-to-left.
- Use natural, native ${language} that a professional would expect in software UI — not literal word-for-word.
- Return ONLY the JSON object, same structure, no prose, no code fences.`;

const res = await fetch(`${BASE}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.2,
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: en }],
    ...(IS_ANTHROPIC ? {} : { response_format: { type: "json_object" } }),
  }),
});
if (!res.ok) { console.error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
const data = await res.json();
let txt = data.choices?.[0]?.message?.content || "";
const m = txt.match(/\{[\s\S]*\}/);
if (!m) { console.error("No JSON in reply:", txt.slice(0, 200)); process.exit(1); }
const obj = JSON.parse(m[0]);
writeFileSync(`messages/${code}.json`, JSON.stringify(obj, null, 2) + "\n");
console.error(`Wrote messages/${code}.json (${language}).`);
