// ============================================================================
// Minimal, dependency-free BigQuery client (server-only).
//
// Instead of the heavy @google-cloud/bigquery SDK, we mint a service-account
// JWT with Node's built-in crypto, exchange it for an access token, and call the
// BigQuery REST `jobs.query` endpoint with fetch. Zero dependencies, small
// serverless footprint.
//
// Auth: set GOOGLE_CREDENTIALS to the service-account JSON (one line) in the env.
// The account needs BigQuery Data Viewer + Job User on the project.
// ============================================================================

import crypto from "crypto";

const RAW = process.env.GOOGLE_CREDENTIALS || "";
export const BIGQUERY_ENABLED = !!RAW;

// Which project runs (bills) the query jobs, and the Reliance-on-Science table.
const BQ_PROJECT = process.env.BQ_PROJECT || "com-sci-2";
const ROS_TABLE = process.env.BQ_ROS_TABLE || "com-sci-2.misc.ros_pat_paper_cites_2023_05_29";

let creds: { client_email: string; private_key: string } | null = null;
function getCreds() {
  if (creds) return creds;
  if (!RAW) throw new Error("BigQuery not configured (GOOGLE_CREDENTIALS).");
  const j = JSON.parse(RAW);
  creds = { client_email: j.client_email, private_key: j.private_key };
  return creds;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

// Cache the access token until shortly before it expires.
let token: { value: string; exp: number } | null = null;
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.exp - 60 > now) return token.value;

  const { client_email, private_key } = getCreds();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const input = `${header}.${claim}`;
  const sig = crypto.createSign("RSA-SHA256").update(input).sign(private_key);
  const jwt = `${input}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`BigQuery auth failed: ${data.error_description || data.error || res.status}`);
  token = { value: data.access_token, exp: now + (data.expires_in || 3600) };
  return token.value;
}

type Param = { name: string; type: "STRING"; array?: boolean; values?: string[]; value?: string };

// Run a parameterized standard-SQL query and return rows as objects.
export async function bqQuery(sql: string, params: Param[] = [], timeoutMs = 30000): Promise<Record<string, string>[]> {
  const accessToken = await getAccessToken();
  const queryParameters = params.map((p) =>
    p.array
      ? { name: p.name, parameterType: { type: "ARRAY", arrayType: { type: p.type } }, parameterValue: { arrayValues: (p.values || []).map((v) => ({ value: v })) } }
      : { name: p.name, parameterType: { type: p.type }, parameterValue: { value: p.value } }
  );

  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/queries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql, useLegacySql: false, parameterMode: "NAMED", queryParameters, timeoutMs, maxResults: 5000 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`BigQuery query failed: ${data?.error?.message || res.status}`);

  const fields: string[] = (data.schema?.fields || []).map((f: any) => f.name);
  const rows: Record<string, string>[] = (data.rows || []).map((r: any) => {
    const o: Record<string, string> = {};
    (r.f || []).forEach((cell: any, i: number) => { o[fields[i]] = cell.v; });
    return o;
  });
  return rows;
}

// ---- Reliance on Science: patents citing a set of papers (by DOI) -----------

export type CitingPatent = { patent: string; filingYear?: number };

// Normalize Scientifiq's paper url (a DOI URL) to a bare, lowercased DOI, the
// form Reliance on Science stores.
export function normalizeDoi(urlOrDoi?: string): string | null {
  if (!urlOrDoi) return null;
  let d = urlOrDoi.trim().toLowerCase();
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:/, "");
  return d.startsWith("10.") ? d : null;
}

// Given paper DOIs, return the distinct front-page-citing patents.
export async function citingPatentsByDoi(dois: string[]): Promise<CitingPatent[]> {
  const clean = [...new Set(dois.map((d) => normalizeDoi(d)).filter(Boolean) as string[])];
  if (clean.length === 0) return [];
  const sql = `
    SELECT DISTINCT patent, MIN(filing_year) AS filing_year
    FROM \`${ROS_TABLE}\`
    WHERE LOWER(doi) IN UNNEST(@dois)
      AND wherefound IN ('frontonly', 'both')
      AND patent IS NOT NULL
    GROUP BY patent`;
  const rows = await bqQuery(sql, [{ name: "dois", type: "STRING", array: true, values: clean }]);
  return rows.map((r) => ({ patent: r.patent, filingYear: r.filing_year ? Number(r.filing_year) : undefined }));
}
