// ============================================================================
// Scientifiq.AI client — the data/model layer for the science modules.
//
// Scientifiq scores every paper/researcher for commercial, scientific, and
// social POTENTIAL (a forward-looking signal computed at publish time), and
// exposes semantic search over ~5M papers, researchers, patents, and grants.
// This is a thin, server-only client over its REST API. Auth is a single
// Bearer key (SCIENTIFIQ_API_KEY); most read endpoints are public with it.
//
// Everything here runs server-side only (the key must never reach the browser).
// ============================================================================

const BASE_URL = (process.env.SCIENTIFIQ_BASE_URL || "https://api.scientifiq.ai/api/v1").replace(/\/$/, "");

export const SCIENTIFIQ_ENABLED = !!process.env.SCIENTIFIQ_API_KEY;

export class ScientifiqError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ScientifiqError";
  }
}

type Query = Record<string, string | number | boolean | undefined | null | (string | number)[]>;

function qs(params: Query): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// One request with a hard timeout, Bearer auth, and the envelope unwrapped.
// Scientifiq wraps every response as { status, message, data }.
async function sciRequest(method: "GET" | "POST", path: string, opts: { params?: Query; body?: any } = {}): Promise<any> {
  const key = process.env.SCIENTIFIQ_API_KEY;
  if (!key) throw new ScientifiqError("Scientifiq is not configured (missing SCIENTIFIQ_API_KEY).", 503);

  const url = `${BASE_URL}${path}${opts.params ? qs(opts.params) : ""}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctl.signal,
      cache: "no-store",
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw new ScientifiqError("Scientifiq request timed out.", 504);
    throw new ScientifiqError(e?.message || "Scientifiq request failed.", 502);
  } finally {
    clearTimeout(timer);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw new ScientifiqError(`Scientifiq error (${res.status}).`, res.status);
    return null;
  }
  if (!res.ok) {
    throw new ScientifiqError(json?.message || `Scientifiq error (${res.status}).`, res.status);
  }
  // Unwrap the { status, message, data } envelope when present.
  return json && typeof json === "object" && "data" in json ? json.data : json;
}

// ---- Domain types (kept loose; the API is the source of truth) -------------

export type SciResearcher = {
  id: string;
  name: string;
  bio?: string;
  totalPubs?: number | string;
  acaCites?: number | string;
  patPaperCites?: number | string;
  lastPublicationYear?: number | string;
  orgs?: string[];
  orgsNames?: string[];
  mainFields?: string[];
  subFields?: string[];
  subfieldsString?: string;
  keywords?: string[];
  keywordsString?: string;
  compot?: number;
  scipot?: number;
  socpot?: number;
  totalScore?: number;
  top20CitedTitles?: string;
  top20RecentTitles?: string;
};

export type SciPaper = {
  id: string;
  title: string;
  abstract?: string;
  year?: number;
  date?: string;
  acaCites?: number;
  patPaperCites?: number;
  url?: string;
  researcherIds?: string[];
  researcherNames?: { res_id: string; res_name: string; res_orgs?: string }[];
  orgs?: string[];
  mainfields?: string[];
  subfields?: string[];
  subfieldsString?: string;
  keywords?: string[];
  keywordsString?: string;
  compot?: number;
  scipot?: number;
  socpot?: number;
  totalScore?: number;
  journal?: string;
};

export type SciPatent = {
  id: string;
  title: string;
  abstract?: string;
  year?: number;
  totalScore?: number;
  cites?: number;
  assigneeNames?: string[];
  inventorNames?: string[];
  url?: string;
  mainfields?: string[];
  subfields?: string[];
  keywords?: string[];
};

export type SciOrg = { id: string; name: string };
export type SciField = { code: string; name: string; type?: "main" | "sub" };

export type SciSandboxScores = {
  rawCommercial?: number;
  rawScientific?: number;
  rawSocial?: number;
  starsCommercial?: number;
  starsScientific?: number;
  starsSocial?: number;
  commercial?: number;
  scientific?: number;
  social?: number;
  field?: number;
};

// ---- Endpoints -------------------------------------------------------------

export type ResearcherQuery = {
  search?: string;
  organizations?: (string | number)[];
  countries?: (string | number)[];
  mainFields?: (string | number)[];
  subFields?: (string | number)[];
  order?: "pubYear" | "commPot" | "sciPot" | "socPot" | "acaCites" | "patCites";
  minCommPot?: number;
  minSciPot?: number;
  minSocPot?: number;
  minPapers?: number;
  relatedResearchers?: string;
  authorSearch?: string;
  limit?: number;
  offset?: number;
};

export async function searchResearchers(q: ResearcherQuery): Promise<{ total: number; researchers: SciResearcher[] }> {
  const data = await sciRequest("GET", "/researchers", { params: q as Query });
  return { total: Number(data?.total || 0), researchers: (data?.researchers || []) as SciResearcher[] };
}

export async function getResearcher(id: string): Promise<any> {
  return sciRequest("GET", `/researchers/${encodeURIComponent(id)}`);
}

export type PaperQuery = {
  search?: string;
  organizations?: (string | number)[];
  countries?: (string | number)[];
  mainFields?: (string | number)[];
  subFields?: (string | number)[];
  year?: string | number;
  order?: "pubYear" | "commPot" | "sciPot" | "socPot" | "acaCites" | "patCites";
  minCommPot?: number;
  minSciPot?: number;
  minSocPot?: number;
  researcherID?: string;
  limit?: number;
  offset?: number;
};

export async function searchPapers(q: PaperQuery): Promise<{ total: number; papers: SciPaper[] }> {
  const data = await sciRequest("GET", "/papers", { params: q as Query });
  return { total: Number(data?.total || 0), papers: (data?.papers || []) as SciPaper[] };
}

export async function searchPatents(q: { search?: string; assignees?: (string | number)[]; patentIDs?: (string | number)[]; mainFields?: (string | number)[]; order?: string; limit?: number }): Promise<{ total: number; patents: SciPatent[] }> {
  const data = await sciRequest("GET", "/patents", { params: q as Query });
  return { total: Number(data?.total || 0), patents: (data?.patents || []) as SciPatent[] };
}

// Organizations lookup — resolve a name like "Duke University" to its id(s).
// Returns every matching org so callers can show affiliated institutions
// (e.g. Duke University, Duke Medical Center, Duke University Health System).
export async function searchOrganizations(search: string, limit = 20): Promise<SciOrg[]> {
  const data = await sciRequest("GET", "/organizations", { params: { search, limit } });
  // Tolerate either a bare array or { organizations: [...] }.
  const list = Array.isArray(data) ? data : data?.organizations || data?.orgs || [];
  return (list as any[]).map((o) => ({ id: String(o.id ?? o._id), name: String(o.name ?? o.orgName ?? "") }));
}

// Countries lookup — resolve a name like "United States" to its 2-letter id.
export async function searchCountries(search: string, limit = 12): Promise<SciOrg[]> {
  const data = await sciRequest("GET", "/countries", { params: { search, limit } });
  const list = Array.isArray(data) ? data : data?.countries || [];
  return (list as any[]).map((c) => ({ id: String(c.id ?? c._id), name: String(c.name ?? "") }));
}

// The field taxonomy is a single endpoint returning both main and sub fields,
// each { code, name, type: "main" | "sub" }. Paper `subfieldsString` values are
// the sub-field CODES, so callers map by `code`, not the mongo `_id`.
export async function getFields(): Promise<SciField[]> {
  const data = await sciRequest("GET", "/fields");
  const list = Array.isArray(data) ? data : data?.fields || [];
  return (list as any[]).map((f) => ({ code: String(f.code ?? f.id ?? ""), name: String(f.name ?? ""), type: f.type }));
}

export type PotentialScore = { raw: number; stars: number }; // raw 0-1, stars 1-5
export type AbstractScores = {
  commercial: PotentialScore;
  scientific: PotentialScore;
  social: PotentialScore;
  field?: number;
};

// Sandbox scoring — paste an abstract, get commercial/scientific/social
// potential. The combined /sandbox route returns empty predictions, so we call
// the three individual model endpoints in parallel.
export async function scoreAbstract(abstract: string): Promise<AbstractScores> {
  const one = async (kind: "commercial" | "scientific" | "social"): Promise<{ p: PotentialScore; field?: number }> => {
    const data = await sciRequest("POST", `/sandbox/${kind}`, { body: { abstract } });
    const pred = data?.predictions || {};
    const cap = kind[0].toUpperCase() + kind.slice(1);
    return { p: { raw: Number(pred[`raw${cap}`] ?? 0), stars: Number(pred[`stars${cap}`] ?? 0) }, field: pred.field };
  };
  const [c, s, so] = await Promise.all([one("commercial"), one("scientific"), one("social")]);
  return { commercial: c.p, scientific: s.p, social: so.p, field: c.field };
}

// Score a single dimension — one sandbox call instead of three. Used by the
// optimizer, which scores many variants and needs to keep the request rate down.
export async function scoreAbstractDimension(abstract: string, kind: "commercial" | "scientific" | "social"): Promise<PotentialScore> {
  const data = await sciRequest("POST", `/sandbox/${kind}`, { body: { abstract } });
  const pred = data?.predictions || {};
  const cap = kind[0].toUpperCase() + kind.slice(1);
  return { raw: Number(pred[`raw${cap}`] ?? 0), stars: Number(pred[`stars${cap}`] ?? 0) };
}
