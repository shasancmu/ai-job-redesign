// ============================================================================
// O*NET / SOC occupation reference + the exposure-data seam.
//
// What's REAL here: a curated set of U.S. SOC-2018 occupations (titles + codes,
// public/BLS) so a free-text role maps to a real occupation instead of one the
// model invents.
//
// What's a SEAM, not fabricated: EXPOSURE_INDEX. We deliberately DO NOT hardcode
// per-occupation exposure figures from memory (that would be fake precision).
// Drop a licensed table in here — e.g. the MIT-licensed gaisi-index
// (github.com/drGolo/gaisi-index) or Eloundou et al.'s released US data — keyed
// by SOC code, value = β exposure (E1 + 0.5·E2, 0–1). occupationExposure()
// returns the published number when present; otherwise the analysis falls back
// to a clearly-labeled rubric estimate (the Eloundou *method* over the person's
// real tasks). This keeps every number either sourced or honestly labeled.
// ============================================================================

import { EXPOSURE_DATA } from "./exposureData";
import { OCC_SKILLS } from "./onetSkills";

export type Occupation = { code: string; title: string; keywords: string[] };

// Colloquial aliases. O*NET titles are formal ("Market Research Analysts and
// Marketing Specialists"); nobody writes that on a CV. These map the words
// people actually use — "revops", "fp&a", "coo" — onto a real SOC code, and
// are scored ON TOP OF the full title index below, not instead of it.
export const ALIASES: Occupation[] = [
  { code: "11-1021", title: "General and Operations Managers", keywords: ["operations", "general manager", "gm", "operations manager", "coo"] },
  { code: "11-2021", title: "Marketing Managers", keywords: ["marketing manager", "head of marketing", "brand manager", "demand generation", "growth marketing"] },
  { code: "11-2011", title: "Advertising and Promotions Managers", keywords: ["advertising", "promotions", "campaign manager", "media"] },
  { code: "11-3021", title: "Computer and Information Systems Managers", keywords: ["it manager", "engineering manager", "information systems", "cto", "vp engineering"] },
  { code: "11-3031", title: "Financial Managers", keywords: ["finance manager", "financial manager", "controller", "treasury", "fp&a"] },
  { code: "11-3121", title: "Human Resources Managers", keywords: ["hr manager", "human resources", "people manager", "head of people", "chro"] },
  { code: "11-2032", title: "Public Relations Managers", keywords: ["public relations", "pr manager", "communications manager", "comms"] },
  { code: "11-3012", title: "Administrative Services Managers", keywords: ["administrative", "office manager", "facilities"] },
  { code: "13-1111", title: "Management Analysts", keywords: ["management consultant", "consultant", "strategy", "management analyst", "business analyst"] },
  { code: "13-1161", title: "Market Research Analysts and Marketing Specialists", keywords: ["market research", "marketing specialist", "marketing coordinator", "marketing associate", "marketing assistant", "insights", "research analyst", "content marketing", "social media"] },
  { code: "13-1082", title: "Project Management Specialists", keywords: ["project manager", "program manager", "pmo", "project management", "scrum"] },
  { code: "13-2011", title: "Accountants and Auditors", keywords: ["accountant", "auditor", "accounting", "audit", "cpa"] },
  { code: "13-2051", title: "Financial and Investment Analysts", keywords: ["financial analyst", "investment analyst", "equity research", "investment", "valuation"] },
  { code: "13-1071", title: "Human Resources Specialists", keywords: ["recruiter", "hr specialist", "talent acquisition", "sourcer", "people ops"] },
  { code: "13-1151", title: "Training and Development Specialists", keywords: ["l&d", "training", "learning and development", "instructional"] },
  { code: "15-1252", title: "Software Developers", keywords: ["software engineer", "developer", "programmer", "full stack", "backend", "frontend"] },
  { code: "15-1211", title: "Computer Systems Analysts", keywords: ["systems analyst", "solutions", "it analyst"] },
  { code: "15-2051", title: "Data Scientists", keywords: ["data scientist", "data analyst", "analytics", "machine learning", "data", "bi analyst"] },
  { code: "15-2041", title: "Statisticians", keywords: ["statistician", "biostatistician", "statistics"] },
  { code: "15-1255", title: "Web and Digital Interface Designers", keywords: ["ux", "ui", "product designer", "web designer", "interface"] },
  { code: "15-1232", title: "Computer User Support Specialists", keywords: ["support", "help desk", "it support", "customer support engineer"] },
  { code: "27-1024", title: "Graphic Designers", keywords: ["graphic designer", "visual designer", "brand designer"] },
  { code: "27-3031", title: "Public Relations Specialists", keywords: ["pr specialist", "public relations specialist", "communications specialist"] },
  { code: "27-3042", title: "Technical Writers", keywords: ["technical writer", "documentation", "docs"] },
  { code: "27-3043", title: "Writers and Authors", keywords: ["writer", "copywriter", "content writer", "editor", "content"] },
  { code: "23-1011", title: "Lawyers", keywords: ["lawyer", "attorney", "legal counsel", "counsel"] },
  { code: "23-2011", title: "Paralegals and Legal Assistants", keywords: ["paralegal", "legal assistant"] },
  { code: "41-3091", title: "Sales Representatives (Services)", keywords: ["sales", "account executive", "ae", "sales rep", "business development", "bdr", "sdr"] },
  { code: "41-4012", title: "Sales Representatives, Wholesale and Manufacturing", keywords: ["wholesale sales", "manufacturing sales", "field sales"] },
  { code: "11-2022", title: "Sales Managers", keywords: ["sales manager", "head of sales", "vp sales", "revenue"] },
  { code: "43-4051", title: "Customer Service Representatives", keywords: ["customer service", "customer success", "csm", "support rep"] },
  { code: "43-6011", title: "Executive Secretaries and Executive Administrative Assistants", keywords: ["executive assistant", "administrative assistant", "chief of staff"] },
  { code: "11-9111", title: "Medical and Health Services Managers", keywords: ["healthcare manager", "health services", "practice manager", "clinical operations"] },
  { code: "29-1141", title: "Registered Nurses", keywords: ["nurse", "registered nurse", "rn"] },
  { code: "25-2021", title: "Elementary and Secondary Teachers", keywords: ["teacher", "educator", "k-12"] },
  { code: "25-1099", title: "Postsecondary Teachers", keywords: ["professor", "lecturer", "faculty", "postsecondary"] },
  { code: "11-9021", title: "Construction Managers", keywords: ["construction manager", "site manager"] },
  { code: "17-2112", title: "Industrial Engineers", keywords: ["industrial engineer", "operations engineer", "process engineer"] },
  { code: "13-1199", title: "Business Operations Specialists", keywords: ["business operations", "biz ops", "operations specialist", "revenue operations", "revops"] },
  // Frontline supervision and support — high-headcount occupations that were
  // unreachable before, so a shift supervisor or an admin assistant got no
  // benchmark at all.
  { code: "51-1011", title: "First-Line Supervisors of Production and Operating Workers", keywords: ["shift supervisor", "production supervisor", "line supervisor", "shift lead", "floor supervisor", "warehouse supervisor", "distribution centre", "distribution center"] },
  { code: "43-1011", title: "First-Line Supervisors of Office and Administrative Support Workers", keywords: ["office supervisor", "admin supervisor", "administrative supervisor", "back office lead"] },
  { code: "41-1011", title: "First-Line Supervisors of Retail Sales Workers", keywords: ["retail supervisor", "store supervisor", "shift manager retail", "duty manager"] },
  { code: "43-6014", title: "Secretaries and Administrative Assistants", keywords: ["administrative assistant", "executive assistant", "office assistant", "admin assistant", "secretary", "operations assistant"] },
  { code: "43-4051", title: "Customer Service Representatives", keywords: ["customer service", "customer support", "support representative", "call centre", "call center", "help desk"] },
  { code: "53-7062", title: "Laborers and Freight, Stock, and Material Movers", keywords: ["warehouse associate", "picker", "packer", "material handler", "stock associate"] },
  // Colloquial titles whose words appear in no O*NET title, so the index alone
  // can never reach them.
  { code: "25-2031", title: "Secondary School Teachers", keywords: ["high school teacher", "secondary teacher", "sixth form"] },
  { code: "25-2021", title: "Elementary School Teachers", keywords: ["primary school teacher", "elementary teacher", "year 3 teacher"] },
  { code: "35-3023", title: "Fast Food and Counter Workers", keywords: ["barista", "counter staff", "crew member"] },
  { code: "29-2061", title: "Licensed Practical and Licensed Vocational Nurses", keywords: ["lpn", "lvn", "practical nurse"] },
  { code: "31-1131", title: "Nursing Assistants", keywords: ["care assistant", "healthcare assistant", "nursing assistant", "hca"] },
  // Deliberately no generic "manager"/"director" here: this is SOC's residual
  // bucket, and as an alias those words swallowed every named manager occupation.
  { code: "11-9199", title: "Managers, All Other", keywords: [] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ");

// Words in a role title that say "this person is not the manager of the
// function". Several managerial titles contain a bare domain word, so without
// this a Marketing Coordinator matched Marketing Managers, and was told its
// exposure under a job title two levels above the one they hold.
const JUNIOR_TITLE = /\b(coordinator|assistant|associate|intern|junior|jr|trainee|apprentice|clerk|aide|technician|specialist|analyst|representative|rep|agent|officer|administrator|support|entry level)\b/;
const SENIOR_TITLE = /\b(manager|director|head|chief|vp|vice president|principal|partner|owner|founder|president|lead|supervisor)\b/;
const isManagerial = (occ: Occupation) => /\bmanagers?\b|chief executives/i.test(occ.title);

// Title words that say nothing about WHICH occupation this is.
const STOP = new Set(["and", "or", "of", "the", "all", "other", "workers", "except", "for", "in", "a", "an", "to", "with"]);

// O*NET titles are plural ("Electricians", "Welders", "Dental Hygienists");
// people write their own job in the singular. Without this, "Welder" matched
// nothing at all and "Dental Hygienist" matched Dental Assistants.
const stem = (w: string) =>
  w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y"
  : w.length > 3 && w.endsWith("ses") ? w.slice(0, -2)
  : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1)
  : w;

const tokens = (s: string) => norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w)).map(stem);

// Every occupation we can actually benchmark: one that has a real O*NET title
// AND a computed exposure figure. Built once, at module load.
//
// This closes a gap that made most of the analysis a guess. exposureData holds
// ~800 occupations; the hand-written alias list reached about forty. Everyone
// else fell through to the model inventing an occupation exposure, shown in the
// same row, with the same authority, as a computed one. Matching against the
// full title index means a shift supervisor, a welder or a dental hygienist
// gets the real number instead.
type Indexed = { occ: Occupation; toks: string[] };
const INDEX: Indexed[] = (() => {
  const out: Indexed[] = [];
  for (const [code, meta] of Object.entries(OCC_SKILLS)) {
    const title = (meta as { title?: string })?.title;
    if (!title || typeof EXPOSURE_DATA[code] !== "number") continue;
    out.push({ occ: { code, title, keywords: [] }, toks: tokens(title) });
  }
  return out;
})();

// Inverse document frequency, so "hospice" or "welder" outweighs "manager".
const IDF: Record<string, number> = (() => {
  const df: Record<string, number> = {};
  for (const { toks } of INDEX) for (const t of new Set(toks)) df[t] = (df[t] || 0) + 1;
  const n = Math.max(1, INDEX.length);
  const out: Record<string, number> = {};
  for (const [t, c] of Object.entries(df)) out[t] = Math.log(n / (1 + c));
  return out;
})();

function titleScore(entry: Indexed, roleToks: Set<string>, hayText: string): number {
  if (!entry.toks.length) return 0;
  let hit = 0;
  let total = 0;
  for (const t of new Set(entry.toks)) {
    const w = IDF[t] ?? 1;
    total += w;
    if (roleToks.has(t)) hit += w;
    else if (hayText.includes(" " + t)) hit += w * 0.15; // weak echo from the body
  }
  if (!total) return 0;
  // Both halves matter. Coverage alone lets a short residual title ("Engineers,
  // All Other") score a perfect 1.0 off one word, while "Welder" matching one
  // distinctive word of four ("Welders, Cutters, Solderers, and Brazers")
  // scores 0.25 and falls under the bar. So: coverage, plus the absolute weight
  // of what actually matched.
  const score = (hit / total) * 6 + hit * 1.2;
  // "All Other" occupations are SOC's residual buckets. They should lose to a
  // named occupation whenever there is one.
  return /\ball other\b/i.test(entry.occ.title) ? score * 0.6 : score;
}

// Aliases must match whole words. Plain substring matching made "underwriters"
// contain "writer", "contractors" contain "cto", and "counselors" contain
// "counsel" — which is how Insurance Underwriters matched Writers and Authors,
// and Credit Counselors matched Lawyers.
const hasPhrase = (hay: string, needle: string) => {
  const n = norm(needle).trim();
  if (!n) return false;
  return new RegExp(`(^| )${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`).test(hay);
};

function aliasScore(occ: Occupation, hayRole: string, hayText: string): number {
  let score = 0;
  for (const kw of occ.keywords) {
    const k = norm(kw);
    if (hasPhrase(hayRole, k)) score += 5 + k.length / 10; // role title match weighs most
    else if (hasPhrase(hayText, k)) score += 1;
  }
  return score;
}

// Match a free-text role (+ optional body text) to the nearest SOC occupation.
export function matchOccupation(role: string, text = ""): Occupation | null {
  const hayRole = norm(role);
  const hayText = " " + norm(text).slice(0, 2000);
  const roleToks = new Set(tokens(role));

  const scores = new Map<string, { occ: Occupation; score: number }>();
  for (const entry of INDEX) {
    const sc = titleScore(entry, roleToks, hayText);
    if (sc > 0) scores.set(entry.occ.code, { occ: entry.occ, score: sc });
  }

  // An alias hit on the ROLE TITLE is the strongest signal available: a person
  // wrote that mapping deliberately. It decides the answer rather than
  // competing with fuzzy title overlap, which otherwise sends "Hospice Nurse"
  // to Nurse Practitioners and "Software Engineer" to QA Testers. Aliases seen
  // only in the body text stay a weak nudge.
  const specific = (k: string) => {
    const n = norm(k).trim();
    if (n.includes(" ")) return true;            // a phrase is deliberate
    return (IDF[stem(n)] ?? 99) >= 3.5;          // a rare single word is too
  };
  const titleAliases = ALIASES.filter((a) =>
    a.keywords.some((k) => hasPhrase(hayRole, k) && specific(k))
  );
  const pool = titleAliases.length ? titleAliases : ALIASES;
  for (const a of pool) {
    const sc = aliasScore(a, hayRole, hayText);
    if (sc <= 0) continue;
    const prev = scores.get(a.code);
    scores.set(a.code, { occ: prev?.occ ?? a, score: (prev?.score ?? 0) + sc });
  }

  const allowed = titleAliases.length ? new Set(titleAliases.map((a) => a.code)) : null;
  const ranked = [...scores.values()]
    .filter((r) => !allowed || allowed.has(r.occ.code))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top || top.score < 3) return null;

  // A junior title with nothing managerial in it shouldn't be benchmarked
  // against a managers' occupation. If there is no non-managerial alternative,
  // decline rather than quote a number from a job they do not hold.
  const juniorRole = JUNIOR_TITLE.test(hayRole) && !SENIOR_TITLE.test(hayRole);
  if (juniorRole && isManagerial(top.occ)) {
    return ranked.find((r) => !isManagerial(r.occ) && r.score >= 3)?.occ ?? null;
  }
  return top.occ;
}

// Exposure table — SOC code → exposure % (0–100). Populated by generating your
// OWN table from public O*NET tasks + the Eloundou rubric (see lib/exposureData.ts
// and scripts/build-exposure.mjs). Empty here until you generate it.
export const EXPOSURE_INDEX: Record<string, number> = { ...EXPOSURE_DATA };

export function occupationExposure(code?: string): number | null {
  if (!code) return null;
  const v = EXPOSURE_INDEX[code];
  return typeof v === "number" ? v : null;
}
