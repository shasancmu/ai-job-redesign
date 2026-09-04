// Nearest Expert — type a problem + a location, get a local -> national -> global
// ladder of researchers who could help. The Scientifiq API supplies the scored
// experts (semantic search); OpenAlex institution geo (a ~12 MB table) supplies
// city/lat-long for near-free, including a free in-warehouse geocode of the
// user's city. Server-only (BigQuery).

import { searchResearchers, type SciResearcher } from "./scientifiq";
import { bqQuery } from "./bigquery";

const GEO_CAP = 200 * 1024 ** 2; // institutions is ~12 MB; a 200 MB cap is plenty and safe

export type Expert = {
  id: string;
  name: string;
  org: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lng?: number;
  km?: number; // distance from the user's anchor, if known
  compot: number;
  scipot: number;
  fields: string;
  keywords: string;
  representative: string[];
};

type Geo = { city?: string; region?: string; country?: string; lat?: number; lng?: number };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function toExpert(r: SciResearcher): Expert {
  const repRaw = (r.top20RecentTitles || r.top20CitedTitles || "").trim();
  const parts = repRaw.split(/\s*[;|\n]\s*/).map((s) => s.trim()).filter(Boolean);
  const representative = parts.length > 1 ? parts.slice(0, 1) : repRaw ? [repRaw.slice(0, 130) + (repRaw.length > 130 ? "…" : "")] : [];
  const fields = (r.subfieldsString || (r.subFields || []).join(", ")).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6).join(", ");
  return {
    id: r.id,
    name: r.name,
    org: (r.orgsNames && r.orgsNames[0]) || "",
    compot: Math.round(Number(r.compot) || 0),
    scipot: Math.round(Number(r.scipot) || 0),
    fields,
    keywords: r.keywordsString || (r.keywords || []).join(", "),
    representative,
  };
}

// Free, in-warehouse geocode: find any institution in the given city and use its
// coordinates as the city anchor. Most cities of interest have a university.
export async function anchorForCity(city: string, countryCode?: string): Promise<{ lat: number; lng: number } | null> {
  const c = city.trim();
  if (!c) return null;
  const params: any[] = [{ name: "c", type: "STRING", value: c }];
  let where = "LOWER(geo.city) = LOWER(@c)";
  if (countryCode) { where += " AND UPPER(geo.country_code) = UPPER(@cc)"; params.push({ name: "cc", type: "STRING", value: countryCode }); }
  try {
    const rows = await bqQuery(
      `SELECT geo.latitude AS lat, geo.longitude AS lng FROM \`com-sci-2.openalex.institutions\`
       WHERE ${where} AND geo.latitude IS NOT NULL ORDER BY works_count DESC LIMIT 1`,
      params, { maxBytesBilled: GEO_CAP }
    );
    if (!rows.length) return null;
    return { lat: Number(rows[0].lat), lng: Number(rows[0].lng) };
  } catch { return null; }
}

// Geo for a set of institution display names (one small query on the tiny table).
async function geoForOrgs(names: string[]): Promise<Map<string, Geo>> {
  const uniq = [...new Set(names.map((n) => (n || "").trim()).filter(Boolean))].slice(0, 80);
  const map = new Map<string, Geo>();
  if (!uniq.length) return map;
  try {
    const rows = await bqQuery(
      `SELECT LOWER(display_name) AS dn, geo.city AS city, geo.region AS region, geo.country AS country, geo.latitude AS lat, geo.longitude AS lng
       FROM \`com-sci-2.openalex.institutions\`
       WHERE LOWER(display_name) IN UNNEST(@o) AND geo.latitude IS NOT NULL`,
      [{ name: "o", type: "STRING", array: true, values: uniq.map((n) => n.toLowerCase()) }], { maxBytesBilled: GEO_CAP }
    );
    for (const r of rows) map.set(r.dn, { city: r.city, region: r.region, country: r.country, lat: r.lat ? Number(r.lat) : undefined, lng: r.lng ? Number(r.lng) : undefined });
  } catch { /* geo optional; degrade to no-distance */ }
  return map;
}

export type ExpertLadder = { local: Expert[]; national: Expert[]; global: Expert[]; anchor: { lat: number; lng: number; label: string } | null; countryName?: string };

// Merge researchers from several topical searches, keeping the best-scored record
// per person. Short topical terms (from the AI step) match far better than a long
// problem sentence, and several facets cover a multi-part problem.
function mergeResearchers(results: SciResearcher[][]): Expert[] {
  const byId = new Map<string, Expert>();
  for (const list of results) {
    for (const r of list) {
      const e = toExpert(r);
      const prev = byId.get(e.id);
      if (!prev || e.compot > prev.compot) byId.set(e.id, e);
    }
  }
  return [...byId.values()];
}

export async function nearestExperts(input: { queries: string[]; countryId?: string; countryName?: string; city?: string }): Promise<ExpertLadder> {
  const queries = [...new Set(input.queries.map((q) => q.trim()).filter((q) => q.length >= 2))].slice(0, 3);
  if (!queries.length) queries.push("");

  // Wide national pool so genuinely-nearby experts (not just the top-N elite
  // labs) can surface for the local ranking; a tighter global pool for the frontier.
  const globalCalls = queries.map((q) => searchResearchers({ search: q, limit: 25 }).then((r) => r.researchers).catch(() => []));
  const nationalCalls = input.countryId
    ? queries.map((q) => searchResearchers({ search: q, countries: [input.countryId!], limit: 60 }).then((r) => r.researchers).catch(() => []))
    : [];
  const [globalLists, nationalLists] = await Promise.all([Promise.all(globalCalls), Promise.all(nationalCalls)]);

  const globalExperts = mergeResearchers(globalLists);
  const nationalExperts = mergeResearchers(nationalLists);

  // geo-enrich everyone in one small query
  const geo = await geoForOrgs([...globalExperts, ...nationalExperts].map((e) => e.org));
  const enrich = (e: Expert) => { const g = geo.get((e.org || "").toLowerCase()); if (g) { e.city = g.city; e.region = g.region; e.country = g.country; e.lat = g.lat; e.lng = g.lng; } };
  globalExperts.forEach(enrich);
  nationalExperts.forEach(enrich);

  // anchor: geocode the user's city (falls back to no distance)
  let anchor: ExpertLadder["anchor"] = null;
  if (input.city) { const a = await anchorForCity(input.city, input.countryId); if (a) anchor = { ...a, label: input.city }; }

  const byCompot = (a: Expert, b: Expert) => b.compot - a.compot;
  // Keep the strongest person per institution, so a tier shows distinct PLACES
  // (not six people from one lab).
  const dedupeByOrg = (list: Expert[]) => {
    const seen = new Set<string>();
    const out: Expert[] = [];
    for (const e of list) { const k = (e.org || e.id).toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(e); } }
    return out;
  };

  // local: the nearest DISTINCT institutions to the anchor (only if we resolved one)
  let local: Expert[] = [];
  if (anchor) {
    const withKm = nationalExperts
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => ({ ...e, km: haversineKm(anchor!, { lat: e.lat!, lng: e.lng! }) }))
      .sort((a, b) => a.km! - b.km! || b.compot - a.compot);
    local = dedupeByOrg(withKm).slice(0, 6);
  }
  const localIds = new Set(local.map((e) => e.id));

  const national = dedupeByOrg(nationalExperts.filter((e) => !localIds.has(e.id)).sort(byCompot)).slice(0, 8);
  const usedIds = new Set([...localIds, ...national.map((e) => e.id)]);
  const global = dedupeByOrg(globalExperts.filter((e) => !usedIds.has(e.id)).sort(byCompot)).slice(0, 8);

  return { local, national, global, anchor, countryName: input.countryName };
}
