// ============================================================================
// Defense Impact — the "defense/national-security potential" signal.
//
// A close cousin of Score My Invention: the LLM estimates how likely a piece of
// science is to influence government / defense-relevant technology (the RFP's
// GPT-4 chain-of-thought scorer). Where a DOI is supplied, we GROUND that
// estimate in real translation evidence from the Scientifiq.AI / Reliance-on-
// Science data already on the platform: which patents cite the paper, and
// whether any of their assignees are defense primes or government bodies.
//
// This is a research-MAPPING score — a lens on where science flows toward public
// and defense applications, in the same spirit as the commercial-potential
// score. It is built only from public bibliometric signals and does not assess
// weaponization pathways. Server-only (it reaches BigQuery + Scientifiq).
// ============================================================================

import { firmsBuildingOnScience, type FirmSummary } from "./citingFirms";
import { BIGQUERY_ENABLED } from "./bigquery";
import { scoreAbstract } from "./scientifiq";
import { defenseImpactAI } from "./ai";
import { scoreText, type ModelScore } from "./sciscore";

// Defense primes, national labs, and funding/agency names. Matched case-
// insensitively as word-ish substrings against patent assignee names (and usable
// against funding acknowledgments). Deliberately high-precision: household
// defense entities, not dual-use generalists like "IBM" or "Google".
const DEFENSE_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "Lockheed Martin", re: /lockheed/i },
  { label: "Raytheon / RTX", re: /raytheon|\brtx\b/i },
  { label: "Northrop Grumman", re: /northrop|grumman/i },
  { label: "General Dynamics", re: /general dynamics/i },
  { label: "BAE Systems", re: /\bbae systems\b/i },
  { label: "L3Harris", re: /l3\s*harris|l-3 communications|\bl3\b/i },
  { label: "Boeing (defense)", re: /boeing/i },
  { label: "Leidos", re: /leidos/i },
  { label: "SAIC", re: /\bsaic\b|science applications international/i },
  { label: "Draper Laboratory", re: /draper laborator/i },
  { label: "MITRE", re: /\bmitre\b/i },
  { label: "The Aerospace Corporation", re: /aerospace corporation/i },
  { label: "Textron", re: /textron/i },
  { label: "Huntington Ingalls", re: /huntington ingalls/i },
  { label: "Sandia National Laboratories", re: /sandia/i },
  { label: "Los Alamos National Laboratory", re: /los alamos/i },
  { label: "Lawrence Livermore National Laboratory", re: /livermore/i },
  { label: "Johns Hopkins APL", re: /applied physics laborator/i },
  { label: "DARPA", re: /\bdarpa\b|defense advanced research/i },
  { label: "Office of Naval Research", re: /naval research|\bonr\b/i },
  { label: "Air Force Research (AFRL/AFOSR)", re: /air force research|\bafosr\b|\bafrl\b/i },
  { label: "Army Research (ARL/ARO)", re: /army research|\barl\b|\baro\b/i },
  { label: "Missile Defense Agency", re: /missile defense/i },
  { label: "DTRA", re: /threat reduction|\bdtra\b/i },
  { label: "IARPA", re: /\biarpa\b/i },
  { label: "U.S. Department of Defense", re: /department of the (navy|army|air force)|secretary of (defense|the navy|the army|the air force)|\bdepartment of defense\b|\bdod\b/i },
  { label: "U.S. Government", re: /united states of america|u\.?s\.? government|national security agency|\bnsa\b/i },
];

export type DefenseFirm = { name: string; matched: string; patents: number; latestYear?: number };

export function matchDefenseEntities(names: string[]): { name: string; matched: string }[] {
  const out: { name: string; matched: string }[] = [];
  for (const n of names) {
    if (!n) continue;
    const hit = DEFENSE_PATTERNS.find((p) => p.re.test(n));
    if (hit) out.push({ name: n, matched: hit.label });
  }
  return out;
}

export type DefenseEvidence = {
  available: boolean;            // did we actually run the patent lookup?
  citingPatentCount: number;     // total distinct patents citing the paper
  defenseFirms: DefenseFirm[];   // citing assignees that are defense entities
  otherFirms: FirmSummary[];     // the rest of the citing firms (context)
  note?: string;                 // why unavailable, when it is
};

const EMPTY: DefenseEvidence = { available: false, citingPatentCount: 0, defenseFirms: [], otherFirms: [] };

// Given a paper DOI, pull its citing patents and flag defense-linked assignees.
// Reuses the same Reliance-on-Science → Scientifiq pipeline as "firms building
// on this science". Never throws: evidence is a bonus, not a hard dependency.
export async function defenseEvidenceForDoi(doi?: string): Promise<DefenseEvidence> {
  const clean = (doi || "").trim();
  if (!clean) return { ...EMPTY, note: "No DOI supplied — the estimate is from the abstract alone." };
  if (!BIGQUERY_ENABLED) return { ...EMPTY, note: "Patent-evidence lookup is not configured in this environment." };
  try {
    const { firms, citingPatentCount } = await firmsBuildingOnScience([{ doi: clean, authors: [] }]);
    const defenseFirms: DefenseFirm[] = [];
    const otherFirms: FirmSummary[] = [];
    for (const f of firms) {
      const hit = DEFENSE_PATTERNS.find((p) => p.re.test(f.name));
      if (hit) defenseFirms.push({ name: f.name, matched: hit.label, patents: f.patents, latestYear: f.latestYear });
      else otherFirms.push(f);
    }
    defenseFirms.sort((a, b) => b.patents - a.patents || (b.latestYear || 0) - (a.latestYear || 0));
    return { available: true, citingPatentCount, defenseFirms, otherFirms: otherFirms.slice(0, 8) };
  } catch (e: any) {
    return { ...EMPTY, note: "Couldn't reach the patent-citation data; showing the abstract-only estimate." };
  }
}

export type DefenseImpactResult = { scores: any; evidence: DefenseEvidence; read: any; title: string; engine: "scibert" | "estimate" };

// The one code path both the in-app module and the public API call. Scores the
// abstract for context, pulls patent evidence (grounding), gets the SciBERT
// estimator's score (the real model), and runs the LLM for the qualitative read.
//
// The NUMBER comes from the SciBERT model when the sciscore service is reachable;
// otherwise it falls back to the LLM's estimate so nothing breaks. The LLM always
// writes the narrative (domains, pathways, verdict) — a classifier can't. A SINGLE
// best-period model (not a per-year family). Throws on hard failure.
export async function runDefenseImpact(input: { abstract: string; title?: string; doi?: string }): Promise<DefenseImpactResult> {
  const abstract = String(input.abstract || "").trim().slice(0, 6000);
  const title = String(input.title || "").trim().slice(0, 300);
  const doi = String(input.doi || "").trim().slice(0, 200);
  const [scores, evidence, modelScore] = await Promise.all([
    scoreAbstract(abstract),
    defenseEvidenceForDoi(doi),
    scoreText("defense_impact", abstract),
  ]);
  const read = await defenseImpactAI({ abstract, title, scores, evidenceSummary: evidenceForPrompt(evidence), modelScore });

  // When the SciBERT model answered, its score is authoritative — override
  // whatever number the LLM produced so the estimator is the source of truth.
  if (modelScore) {
    read.scorePct = Math.round(modelScore.score * 100);
    read.stars = modelScore.stars;
  }
  return { scores, evidence, read, title, engine: modelScore ? "scibert" : "estimate" };
}

// A compact, model-readable summary of the hard evidence, folded into the AI
// prompt so the estimate is grounded in real translation signal when present.
export function evidenceForPrompt(ev: DefenseEvidence): string {
  if (!ev.available) return "No patent-citation evidence was available; estimate from the abstract alone and keep confidence modest.";
  if (ev.citingPatentCount === 0) return "This paper has NO patents citing it yet in the Reliance-on-Science data. Absence of translation so far — weigh accordingly.";
  if (ev.defenseFirms.length === 0) return `This paper is cited by ${ev.citingPatentCount} patent(s), but NONE of the resolved assignees are defense primes or government bodies. Commercial translation exists; direct defense translation is not yet visible.`;
  const list = ev.defenseFirms.slice(0, 6).map((f) => `${f.matched} (${f.patents} patent${f.patents === 1 ? "" : "s"})`).join("; ");
  return `HARD EVIDENCE: this paper is already cited by patents assigned to defense entities — ${list}. This is real, observed defense translation, not speculation. Reflect it in a higher score and higher confidence.`;
}
