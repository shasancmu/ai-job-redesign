#!/usr/bin/env node
// ============================================================================
// sync-module-strings.mjs — pull every module's name + tagline out of the
// registry (lib/modules.ts) into messages/en.json under `modules.{slug}`.
// The registry stays the single source of truth; this just mirrors the English
// into the base locale so the generator can translate it.
//
//   node scripts/sync-module-strings.mjs
//
// After adding/editing a module, the whole flow is two commands:
//   node scripts/sync-module-strings.mjs      (this — mirror English into en.json)
//   node scripts/build-messages.mjs --all     (translate ONLY the new/changed keys)
// The generator is incremental, so a new module costs a couple of tiny
// translations, not a full re-translation. Until you run them, new modules
// simply show their English name/tagline everywhere (the Catalog's tf()
// fallback), so nothing ever breaks.
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("lib/modules.ts", "utf8");
const region = src.slice(src.indexOf("export const MODULES"), src.indexOf("export const ALL_ACCESS"));

// Each module lists slug, then (a few fields later) name, then tagline — all
// double-quoted. Non-greedy hops keep each match inside one object.
const re = /slug:\s*"([^"]+)"[\s\S]*?name:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?tagline:\s*"((?:[^"\\]|\\.)*)"/g;
const unescape = (s) => s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

const modules = {};
let m;
while ((m = re.exec(region))) {
  modules[m[1]] = { name: unescape(m[2]), tagline: unescape(m[3]) };
}
const count = Object.keys(modules).length;
if (count === 0) {
  console.error("No modules parsed — did lib/modules.ts change shape?");
  process.exit(1);
}

const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
en.modules = modules;
writeFileSync("messages/en.json", JSON.stringify(en, null, 2) + "\n");
console.error(`Synced ${count} module name/tagline pairs into messages/en.json.`);
