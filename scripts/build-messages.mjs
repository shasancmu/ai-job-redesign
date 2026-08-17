#!/usr/bin/env node
// ============================================================================
// build-messages.mjs — INCREMENTAL UI translation.
//
// Only translates keys that are NEW or whose English source CHANGED since the
// last run; everything already translated is left untouched (no drift, no
// wasted tokens). Adding a module or a handful of room strings costs a few tiny
// translations, not a full re-translation of every locale.
//
//   node scripts/build-messages.mjs <Language> <code>   # one locale, incremental
//   node scripts/build-messages.mjs --all               # every shipped locale
//   node scripts/build-messages.mjs <Language> <code> --force   # re-translate all keys
//
// Change detection uses messages/.i18n-hashes.json (a per-locale map of
// keypath -> hash of the English string last translated). First run on an
// already-translated locale just seeds the hashes (no API calls).
//
// Env: AI_API_KEY [, AI_BASE_URL, AI_MODEL].
// ============================================================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Every locale we ship UI for: code -> language name given to the model.
const LOCALES = {
  es: "Spanish",
  ar: "Arabic",
  "pt-BR": "Brazilian Portuguese",
  zh: "Simplified Chinese",
  hi: "Hindi",
  fr: "French",
  de: "German",
  it: "Italian",
};

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const rest = argv.filter((a) => a !== "--force");
const all = rest.includes("--all");

const BASE = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";
const KEY = process.env.AI_API_KEY;
if (!KEY) { console.error("Set AI_API_KEY (and optionally AI_BASE_URL, AI_MODEL)."); process.exit(1); }
const IS_ANTHROPIC = BASE.includes("anthropic.com");

const HASH_FILE = "messages/.i18n-hashes.json";

// ---- helpers ---------------------------------------------------------------
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
function unflatten(flat) {
  const root = {};
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = val;
  }
  return root;
}

async function translateBatch(language, entries) {
  // entries: array of [keypath, englishValue]. Returns { keypath: translated }.
  const payload = Object.fromEntries(entries);
  const SYSTEM = `You are a professional software localizer. Translate the VALUES of this JSON object into ${language} for a professional web app.
Rules:
- Keep every KEY exactly as-is (the keys are internal identifiers — never translate or alter them).
- Keep placeholders like {name}, {n}, {code}, {total}, {title} EXACTLY, in place.
- Keep leading UI symbols/arrows (▸ ▾ ✓ → ✨ ·) in place; mirror arrows naturally if the language is right-to-left.
- Use natural, native ${language} that a professional expects in software UI — not literal word-for-word.
- Do NOT put unescaped double-quote (") characters inside a value — it breaks the JSON. If you need quotation marks, use guillemets («») or single quotes.
- Return ONLY the JSON object, same keys, translated values, no prose, no code fences.`;
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0.2,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(payload, null, 2) }],
      ...(IS_ANTHROPIC ? {} : { response_format: { type: "json_object" } }),
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const txt = data.choices?.[0]?.message?.content || "";
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`No JSON in reply: ${txt.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

async function buildLocale(code, language, en, hashes) {
  const path = `messages/${code}.json`;
  const existing = existsSync(path) ? flatten(JSON.parse(readFileSync(path, "utf8"))) : {};
  const recorded = hashes[code] || {};
  const nextRecorded = {};
  const out = {};
  const toTranslate = [];

  for (const [key, enVal] of Object.entries(en)) {
    const h = fnv1a(String(enVal));
    nextRecorded[key] = h;
    const have = existing[key];
    if (force) { toTranslate.push([key, enVal]); continue; }
    if (have === undefined) { toTranslate.push([key, enVal]); continue; }       // new key
    if (recorded[key] !== undefined && recorded[key] !== h) {                    // English changed
      toTranslate.push([key, enVal]); continue;
    }
    out[key] = have; // keep existing translation (also seeds first-run hashes)
  }

  if (toTranslate.length === 0) {
    hashes[code] = nextRecorded;
    console.error(`${code} (${language}): up to date — ${Object.keys(en).length} keys, 0 translated.`);
    return unflatten(out);
  }

  // Batch to keep each request small and reliable. If a batch comes back as
  // invalid JSON (a model can mangle quotes), retry it key-by-key; anything
  // that still fails keeps its English (the UI falls back gracefully anyway).
  const BATCH = 40;
  for (let i = 0; i < toTranslate.length; i += BATCH) {
    const chunk = toTranslate.slice(i, i + BATCH);
    let translated;
    try {
      translated = await translateBatch(language, chunk);
    } catch {
      translated = {};
      for (const [k, v] of chunk) {
        try {
          const one = await translateBatch(language, [[k, v]]);
          translated[k] = one[k];
        } catch {
          translated[k] = v; // keep English for this one
        }
      }
    }
    for (const [key] of chunk) {
      out[key] = translated[key] !== undefined ? translated[key] : en[key];
    }
  }
  hashes[code] = nextRecorded;
  console.error(`${code} (${language}): translated ${toTranslate.length}, kept ${Object.keys(en).length - toTranslate.length}.`);
  return unflatten(out);
}

// ---- main ------------------------------------------------------------------
const en = flatten(JSON.parse(readFileSync("messages/en.json", "utf8")));
const hashes = existsSync(HASH_FILE) ? JSON.parse(readFileSync(HASH_FILE, "utf8")) : {};

let targets;
if (all) {
  targets = Object.entries(LOCALES);
} else {
  const [language, code] = rest;
  if (!language || !code) {
    console.error("Usage: build-messages.mjs <Language> <code> | --all [--force]");
    process.exit(1);
  }
  targets = [[code, language]];
}

for (const [code, language] of targets) {
  const nested = await buildLocale(code, language, en, hashes);
  writeFileSync(`messages/${code}.json`, JSON.stringify(nested, null, 2) + "\n");
}
writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2) + "\n");
console.error("Done.");
