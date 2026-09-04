// Science Intelligence — three warehouse-powered reports:
//   * talentMap: the top experts in a field, WHERE they are (geo) and WHO they
//     patent for (res_current_assignee) — the hireable/academic ones flagged.
//   * nationalCapability: a country's research strengths by field + top people.
//   * emergingCompetitors: firms building on the same science a company cites.
// Costs (measured, capped): talent ~2GB, national ~2-3GB, competitors RoS+API.
// Cacheable; materialize the slim scored tables later for near-zero cost.

import { getFields, type SciField } from "./scientifiq";
import { bqQuery } from "./bigquery";
import { companyFootprint } from "./scienceRadar";
import { citedDoisByPatents } from "./bigquery";
import { firmsBuildingOnScience } from "./citingFirms";

const CAP = 4 * 1024 ** 3;
const KW_STOP = new Set("management systems technology control design based using system method process engineering science analysis application development general the and for".split(" "));

function kwClauseAndParams(field: string, col: string): { clause: string; params: any[] } {
  const toks = [...new Set(field.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !KW_STOP.has(w)))].slice(0, 5);
  const list = toks.length ? toks : [field.toLowerCase().trim()];
  return { clause: "(" + list.map((_, i) => `LOWER(${col}) LIKE @kw${i}`).join(" OR ") + ")", params: list.map((t, i) => ({ name: `kw${i}`, type: "STRING" as const, value: `%${t}%` })) };
}

let fieldMap: Map<string, string> | null = null;
async function fieldNames(): Promise<Map<string, string>> {
  if (fieldMap) return fieldMap;
  const f: SciField[] = await getFields().catch(() => []);
  fieldMap = new Map(f.map((x) => [String(x.code), x.name]));
  return fieldMap;
}

const isAcademic = (name?: string) => !name || /univ|institut|college|regents|trustees|academ|school|laborat|cnrs|max planck|society|ministry/i.test(name);

// ---- 1) Talent Map ----------------------------------------------------------
export async function talentMap(field: string) {
  const { clause, params } = kwClauseAndParams(field, "r.res_keywords_string");
  const sql = `
    SELECT r.res_id id, r.res_name name, ROUND(r.res_compot) compot,
           r.res_orgs_names[SAFE_OFFSET(0)] org,
           r.res_current_assignee[SAFE_OFFSET(0)] employer,
           r.res_countries[SAFE_OFFSET(0)] country,
           r.res_subfields_string fields,
           ANY_VALUE(i.geo.city) city, ANY_VALUE(i.geo.latitude) lat, ANY_VALUE(i.geo.longitude) lng
    FROM \`com-sci-2.scientifiq_prod.researchers\` r
    LEFT JOIN \`com-sci-2.openalex.institutions\` i ON LOWER(i.display_name)=LOWER(r.res_orgs_names[SAFE_OFFSET(0)])
    WHERE ${clause} AND r.res_compot >= 68 AND r.res_last_publication_year >= 2020
    GROUP BY id, name, compot, org, employer, country, fields
    ORDER BY compot DESC LIMIT 40`;
  const rows = await bqQuery(sql, params, { maxBytesBilled: CAP });
  const experts = rows.map((r) => ({
    id: r.id, name: r.name, compot: Number(r.compot) || 0, org: r.org || "",
    employer: r.employer || "", academic: isAcademic(r.employer), country: r.country,
    city: r.city, lat: r.lat != null ? Number(r.lat) : undefined, lng: r.lng != null ? Number(r.lng) : undefined,
    fields: (r.fields || "").split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 5).join(", "),
  }));
  // employer breakdown (companies only)
  const byEmployer = new Map<string, number>();
  for (const e of experts) if (e.employer && !e.academic) byEmployer.set(e.employer, (byEmployer.get(e.employer) || 0) + 1);
  const topEmployers = [...byEmployer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, n }));
  const unaffiliated = experts.filter((e) => e.academic).slice(0, 12);
  return { field, experts: experts.slice(0, 24), topEmployers, unaffiliated, total: experts.length };
}

// ---- 2) National Capability -------------------------------------------------
export async function nationalCapability(countryId: string, countryName: string) {
  const p = [{ name: "cc", type: "STRING" as const, value: countryId }];
  const [subRows, resRows, names] = await Promise.all([
    bqQuery(`
      SELECT sf subfield, COUNT(*) n, ROUND(AVG(res_compot)) avg_cp
      FROM \`com-sci-2.scientifiq_prod.researchers\` r, UNNEST(r.res_subfields) sf
      WHERE @cc IN UNNEST(r.res_countries) AND r.res_compot IS NOT NULL AND r.res_last_publication_year >= 2018
      GROUP BY sf HAVING n >= 15 ORDER BY avg_cp * LN(n + 2) DESC LIMIT 12`, p, { maxBytesBilled: CAP }),
    bqQuery(`
      SELECT res_name name, ROUND(res_compot) compot, res_orgs_names[SAFE_OFFSET(0)] org, res_subfields_string fields
      FROM \`com-sci-2.scientifiq_prod.researchers\`
      WHERE @cc IN UNNEST(res_countries) AND res_compot IS NOT NULL AND res_last_publication_year >= 2018
      ORDER BY res_compot DESC LIMIT 15`, p, { maxBytesBilled: CAP }),
    fieldNames(),
  ]);
  const strengths = subRows.map((r) => ({ subfield: names.get(String(r.subfield)) || `Field ${r.subfield}`, researchers: Number(r.n), avgCompot: Number(r.avg_cp) }));
  const topResearchers = resRows.map((r) => ({ name: r.name, compot: Number(r.compot), org: r.org, fields: (r.fields || "").split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 4).join(", ") }));
  return { countryName, strengths, topResearchers };
}

// ---- 3) Emerging Competitors ------------------------------------------------
export async function emergingCompetitors(company: string) {
  const footprint = await companyFootprint(company);
  if (!footprint.found) return { error: "Couldn't find that company's patents. Try the exact registered name." };
  let dois: string[] = [];
  try { const rows = await citedDoisByPatents(footprint.patentIds); dois = [...new Set(rows.map((r) => r.doi))].slice(0, 100); } catch { /* optional */ }
  let firms: any = null;
  if (dois.length) firms = await firmsBuildingOnScience(dois.map((d) => ({ doi: d, authors: [] }))).catch(() => null);
  const tok = company.toLowerCase().split(/\s+/)[0];
  const competitors = (firms?.firms || [])
    .filter((f: any) => !f.name.toLowerCase().includes(tok))
    .sort((a: any, b: any) => (b.latestYear || 0) - (a.latestYear || 0) || b.patents - a.patents)
    .slice(0, 15);
  return { company, footprint, citedCount: dois.length, competitors };
}
