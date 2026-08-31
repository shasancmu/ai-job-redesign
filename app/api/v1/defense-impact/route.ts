import { AI_ENABLED } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { SCISCORE_ENABLED } from "@/lib/sciscore";
import { setFlow } from "@/lib/aiflow";
import { runDefenseImpact } from "@/lib/defenseImpact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ============================================================================
// Public Defense Impact API — a stable, programmatic endpoint anyone with a key
// can hit. A SINGLE best-period model (not a per-year family): it uses the most
// recent, best-labeled data period. Estimates a paper's defense / national-
// security relevance, grounded in real patent-citation evidence when a DOI is
// given. A research-MAPPING score — it maps relevance, not intent.
//
//   POST /api/v1/defense-impact
//   Authorization: Bearer <DEFENSE_API_KEY>
//   { "abstract": "...", "title": "optional", "doi": "optional" }
//
// Keys: set DEFENSE_API_KEY (single) or DEFENSE_API_KEYS (comma-separated).
// ============================================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: any, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

function validKeys(): string[] {
  const raw = `${process.env.DEFENSE_API_KEY || ""},${process.env.DEFENSE_API_KEYS || ""}`;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// Constant-ish time bearer check against the configured key set.
function authorized(request: Request): boolean {
  const keys = validKeys();
  if (keys.length === 0) return false;
  const hdr = request.headers.get("authorization") || "";
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  const presented = (m?.[1] || request.headers.get("x-api-key") || "").trim();
  if (!presented) return false;
  return keys.includes(presented);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// Self-describing docs / health check. No key required for the docs.
export async function GET() {
  return json({
    name: "Defense Impact API",
    version: "1",
    method: "POST",
    auth: "Authorization: Bearer <DEFENSE_API_KEY>",
    body: { abstract: "string (required, ≥80 chars)", title: "string (optional)", doi: "string (optional — unlocks patent evidence)" },
    returns: {
      engine: "'scibert' when the trained model scored it, else 'estimate' (LLM fallback)",
      read: { scorePct: "0-100", stars: "1-5", confidence: "High|Moderate|Low", domains: "[]", pathways: "[]", dualUse: "string", whoCares: "[]", verdict: "string" },
      scores: "Scientifiq commercial/scientific/social potential (context)",
      evidence: "citing patents + defense-linked assignees when a DOI is supplied",
    },
    model: "Score from a SciBERT defense-impact classifier (frozen-embedding head; single best-period model) when the sciscore service is configured; LLM estimate otherwise. A research-mapping score — it maps relevance, not intent.",
    scibertConfigured: SCISCORE_ENABLED,
    configured: SCIENTIFIQ_ENABLED && AI_ENABLED && validKeys().length > 0,
  });
}

export async function POST(request: Request) {
  setFlow("defense-impact-api");
  if (validKeys().length === 0) return json({ error: "API is not configured (no DEFENSE_API_KEY set)." }, 503);
  if (!authorized(request)) return json({ error: "Unauthorized. Send Authorization: Bearer <key>." }, 401);
  if (!SCIENTIFIQ_ENABLED || !AI_ENABLED) return json({ error: "Scoring backend is not configured." }, 503);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  const abstract = String(body?.abstract || "").trim();
  if (abstract.length < 80) return json({ error: "Field 'abstract' is required (a few sentences, ≥80 chars)." }, 400);

  try {
    const { scores, evidence, read, title, engine } = await runDefenseImpact({
      abstract,
      title: String(body?.title || ""),
      doi: String(body?.doi || ""),
    });
    if (!read) return json({ error: "Scored it but the model returned no read. Try again." }, 502);
    return json({ ok: true, title, engine, read, scores, evidence });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return json({ error: e.message }, e.status < 600 ? e.status : 502);
    return json({ error: e?.message || "Failed to estimate defense impact." }, 500);
  }
}
