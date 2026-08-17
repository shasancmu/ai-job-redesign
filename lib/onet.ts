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

export type Occupation = { code: string; title: string; keywords: string[] };

// A focused set of common professional occupations (SOC 2018). Extend freely.
export const OCCUPATIONS: Occupation[] = [
  { code: "11-1021", title: "General and Operations Managers", keywords: ["operations", "general manager", "gm", "operations manager", "coo"] },
  { code: "11-2021", title: "Marketing Managers", keywords: ["marketing manager", "marketing", "brand", "demand generation", "growth marketing"] },
  { code: "11-2011", title: "Advertising and Promotions Managers", keywords: ["advertising", "promotions", "campaign manager", "media"] },
  { code: "11-3021", title: "Computer and Information Systems Managers", keywords: ["it manager", "engineering manager", "information systems", "cto", "vp engineering"] },
  { code: "11-3031", title: "Financial Managers", keywords: ["finance manager", "financial manager", "controller", "treasury", "fp&a"] },
  { code: "11-3121", title: "Human Resources Managers", keywords: ["hr manager", "human resources", "people manager", "head of people", "chro"] },
  { code: "11-2032", title: "Public Relations Managers", keywords: ["public relations", "pr manager", "communications manager", "comms"] },
  { code: "11-3012", title: "Administrative Services Managers", keywords: ["administrative", "office manager", "facilities"] },
  { code: "13-1111", title: "Management Analysts", keywords: ["management consultant", "consultant", "strategy", "management analyst", "business analyst"] },
  { code: "13-1161", title: "Market Research Analysts and Marketing Specialists", keywords: ["market research", "marketing specialist", "insights", "research analyst"] },
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
  { code: "11-9199", title: "Managers, All Other", keywords: ["manager", "director", "head of", "lead"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ");

// Match a free-text role (+ optional body text) to the nearest SOC occupation.
export function matchOccupation(role: string, text = ""): Occupation | null {
  const hayRole = norm(role);
  const hayText = norm(text).slice(0, 2000);
  let best: Occupation | null = null;
  let bestScore = 0;
  for (const occ of OCCUPATIONS) {
    let score = 0;
    for (const kw of occ.keywords) {
      const k = norm(kw);
      if (hayRole.includes(k)) score += 5 + k.length / 10; // role title match weighs most
      else if (hayText.includes(k)) score += 1;
    }
    // light bonus for title-word overlap
    for (const w of norm(occ.title).split(" ")) {
      if (w.length > 3 && hayRole.includes(w)) score += 1.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = occ;
    }
  }
  return bestScore >= 3 ? best : null;
}

// Licensed exposure table — SOC code → β exposure (0–1). EMPTY by default:
// populate from a licensed source (gaisi-index / Eloundou). Not fabricated.
export const EXPOSURE_INDEX: Record<string, number> = {};

export function occupationExposure(code?: string): number | null {
  if (!code) return null;
  const v = EXPOSURE_INDEX[code];
  return typeof v === "number" ? v : null;
}
