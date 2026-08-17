#!/usr/bin/env node
// ============================================================================
// build-onet-skills.mjs — turn the O*NET database text files into the data the
// Career Roadmap module needs: per-occupation skill profiles (importance +
// level over the 35 O*NET skills), Job Zone, title, and a precomputed
// "related careers" neighbors table (skill-similarity cross-checked against
// O*NET's own Related Occupations — the hybrid recommender).
//
//   node scripts/build-onet-skills.mjs            # reads data/onet/*.txt
//   node scripts/build-onet-skills.mjs --wages data/onet/oe_national.csv
//
// Source files (CC BY, from onetcenter.org db_XX_text.zip), in data/onet/:
//   Skills.txt · Job Zones.txt · Occupation Data.txt · Related Occupations.txt
// Writes lib/onetSkills.ts. Skill data is real O*NET analyst ratings — no LLM.
// ============================================================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DIR = "data/onet";
const soc6 = (c) => c.split(".")[0].trim(); // O*NET-SOC "15-1252.00" -> SOC "15-1252"

function tsv(path) {
  const lines = readFileSync(`${DIR}/${path}`, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split("\t");
  return lines.slice(1).map((l) => {
    const c = l.split("\t");
    const row = {};
    header.forEach((h, i) => (row[h] = c[i]));
    return row;
  });
}

// ---- 1. Skills: aggregate IM + LV per SOC over the 35 basic/cross-functional skills
const skillRows = tsv("Skills.txt").filter(
  (r) => /^2\.[AB]\./.test(r["Element ID"]) && (r["Scale ID"] === "IM" || r["Scale ID"] === "LV")
);
const skillMeta = new Map(); // elementId -> name
const agg = {}; // soc -> elementId -> {imSum,imN,lvSum,lvN}
for (const r of skillRows) {
  const soc = soc6(r["O*NET-SOC Code"]);
  const eid = r["Element ID"];
  skillMeta.set(eid, r["Element Name"]);
  const v = parseFloat(r["Data Value"]);
  if (!isFinite(v)) continue;
  agg[soc] = agg[soc] || {};
  const cell = (agg[soc][eid] = agg[soc][eid] || { imSum: 0, imN: 0, lvSum: 0, lvN: 0 });
  if (r["Scale ID"] === "IM") { cell.imSum += v; cell.imN++; }
  else { cell.lvSum += v; cell.lvN++; }
}
const SKILLS = [...skillMeta.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([id, name]) => ({ id, name }));

// ---- 2. Job Zones, 3. Titles, 4. Related Occupations
const zones = {};
for (const r of tsv("Job Zones.txt")) {
  const s = soc6(r["O*NET-SOC Code"]);
  const z = parseInt(r["Job Zone"], 10);
  if (isFinite(z)) (zones[s] = zones[s] || []).push(z);
}
const zoneOf = (s) => (zones[s]?.length ? Math.round(zones[s].reduce((a, b) => a + b, 0) / zones[s].length) : null);

const titles = {};
for (const r of tsv("Occupation Data.txt")) {
  const c = r["O*NET-SOC Code"];
  if (c.endsWith(".00")) titles[soc6(c)] = r["Title"]; // prefer the base title
}

const related = {}; // soc -> Set(related soc)
for (const r of tsv("Related Occupations.txt")) {
  const a = soc6(r["O*NET-SOC Code"]);
  const b = soc6(r["Related O*NET-SOC Code"]);
  if (a !== b) (related[a] = related[a] || new Set()).add(b);
}

// ---- 5. Build per-SOC vectors (im[], lv[]) aligned to SKILLS
const OCC = {}; // soc -> { title, zone, im[], lv[] }
for (const soc of Object.keys(agg)) {
  const im = [], lv = [];
  let any = false;
  for (const { id } of SKILLS) {
    const c = agg[soc][id];
    const imv = c && c.imN ? c.imSum / c.imN : 0;
    const lvv = c && c.lvN ? c.lvSum / c.lvN : 0;
    if (imv || lvv) any = true;
    im.push(Math.round(imv * 10) / 10);
    lv.push(Math.round(lvv * 10) / 10);
  }
  if (!any) continue;
  OCC[soc] = { title: titles[soc] || soc, zone: zoneOf(soc), im, lv, wage: null };
}

// ---- 6. Similarity on the importance×level vector, blended with Related.
// Mean-CENTER each skill dimension first (subtract the cross-occupation mean),
// so similarity reflects *distinctive* skill overlap, not the common baseline
// every job shares. That turns cosine into a correlation that spreads 0..1
// instead of everything clustering at ~0.95.
const vecOf = (o) => o.im.map((x, i) => x * o.lv[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = (a) => Math.sqrt(dot(a, a)) || 1;
const codes = Object.keys(OCC);
const rawVecs = Object.fromEntries(codes.map((c) => [c, vecOf(OCC[c])]));
const dims = SKILLS.length;
const mean = Array.from({ length: dims }, (_, i) =>
  codes.reduce((s, c) => s + rawVecs[c][i], 0) / codes.length
);
const vecs = Object.fromEntries(codes.map((c) => [c, rawVecs[c].map((x, i) => x - mean[i])]));
const norms = Object.fromEntries(codes.map((c) => [c, norm(vecs[c])]));

const NEIGHBORS = {};
for (const a of codes) {
  const rel = related[a] || new Set();
  const scored = [];
  for (const b of codes) {
    if (b === a) continue;
    const sim = dot(vecs[a], vecs[b]) / (norms[a] * norms[b]); // 0..1
    const isRel = rel.has(b);
    // Hybrid: skill-similarity, nudged up when O*NET also calls them related.
    const blended = Math.min(1, sim + (isRel ? 0.12 : 0));
    scored.push({ code: b, sim: Math.round(sim * 1000) / 1000, blended, rel: isRel });
  }
  scored.sort((x, y) => y.blended - x.blended);
  NEIGHBORS[a] = scored.slice(0, 15).map(({ code, sim, rel }) => ({ code, sim, rel }));
}

// ---- 7. (optional) wages, if a BLS OEWS national CSV is supplied
const wIdx = process.argv.indexOf("--wages");
if (wIdx > -1 && existsSync(process.argv[wIdx + 1])) {
  const raw = readFileSync(process.argv[wIdx + 1], "utf8").split(/\r?\n/);
  const head = raw[0].split(/[,\t]/).map((h) => h.replace(/"/g, "").trim().toUpperCase());
  const iCode = head.findIndex((h) => h === "OCC_CODE");
  const iMed = head.findIndex((h) => h === "A_MEDIAN");
  if (iCode > -1 && iMed > -1) {
    for (const line of raw.slice(1)) {
      const c = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((x) => x.replace(/^"|"$/g, "").trim());
      const soc = c[iCode];
      const med = parseInt((c[iMed] || "").replace(/[^0-9]/g, ""), 10);
      if (OCC[soc] && isFinite(med)) OCC[soc].wage = med;
    }
  }
}

// ---- 8. Emit lib/onetSkills.ts
const banner = `// GENERATED by scripts/build-onet-skills.mjs — do not edit by hand.
// Source: O*NET 29.0 Database (CC BY 4.0, onetcenter.org). Skill ratings are
// real O*NET analyst data. NEIGHBORS = cosine skill-similarity blended with
// O*NET Related Occupations. Wages (when present) are BLS OEWS median annual.
`;
const out =
  banner +
  `export type Skill = { id: string; name: string };\n` +
  `export type OccSkill = { title: string; zone: number | null; im: number[]; lv: number[]; wage: number | null };\n` +
  `export type Neighbor = { code: string; sim: number; rel: boolean };\n\n` +
  `export const SKILLS: Skill[] = ${JSON.stringify(SKILLS)};\n\n` +
  `export const OCC_SKILLS: Record<string, OccSkill> = ${JSON.stringify(OCC)};\n\n` +
  `export const NEIGHBORS: Record<string, Neighbor[]> = ${JSON.stringify(NEIGHBORS)};\n`;
writeFileSync("lib/onetSkills.ts", out);
console.error(`Wrote lib/onetSkills.ts — ${codes.length} occupations, ${SKILLS.length} skills.`);
