// ============================================================================
// Research Agent — one natural-language entry over the Scientifiq platform.
//
// The "mostly there" agents (find-collaborators, licensing, domain-brief, the
// impact models) are separate modules. This unifies them: Claude classifies the
// question, the route runs the matching capability over Scientifiq's data, and
// Claude synthesizes an evidence-backed answer. Route-and-synthesize, not a full
// tool loop — no new agent infra, and every answer is grounded in real results.
// Server-only.
// ============================================================================

import { agentClassifyAI, agentAnswerAI } from "./ai";
import { searchResearchers, searchPapers, searchOrganizations, scoreAbstract } from "./scientifiq";
import { scoreText } from "./sciscore";

export type AgentIntent = "experts" | "impact" | "landscape" | "other";
export type AgentEvidence =
  | { kind: "experts"; items: { name: string; org: string; compot: number; scipot: number; subfields?: string }[] }
  | { kind: "impact"; scores: Record<string, number> }
  | { kind: "papers"; items: { title: string; year?: number; compot: number; authors?: string }[] }
  | { kind: "none" };

export type AgentResult = { intent: AgentIntent; restate: string; answer: string; evidence: AgentEvidence };

const pct = (x: any) => Math.round((x?.raw ?? x ?? 0) * 100);

async function classify(question: string): Promise<{ intent: AgentIntent; topic: string; scope: string; abstract: string; restate: string }> {
  const r = await agentClassifyAI(question);
  return {
    intent: (["experts", "impact", "landscape", "other"].includes(r?.intent) ? r.intent : "other") as AgentIntent,
    topic: String(r?.topic || ""), scope: String(r?.scope || ""), abstract: String(r?.abstract || ""),
    restate: String(r?.restate || question.slice(0, 140)),
  };
}

async function orgIds(scope: string): Promise<(string | number)[] | undefined> {
  if (!scope.trim()) return undefined;
  try { const orgs = await searchOrganizations(scope, 6); return orgs.length ? orgs.map((o) => o.id) : undefined; }
  catch { return undefined; }
}

export async function runResearchAgent(question: string, opts: { includeDefense?: boolean } = {}): Promise<AgentResult> {
  const c = await classify(question);
  let evidence: AgentEvidence = { kind: "none" };
  let evidenceText = "";

  if (c.intent === "experts") {
    const { researchers } = await searchResearchers({ search: c.topic || question, organizations: await orgIds(c.scope), order: "commPot", minPapers: 3, limit: 10 });
    const items = researchers.slice(0, 8).map((r) => ({ name: r.name, org: (r.orgsNames || [])[0] || "", compot: pct((r as any).compot), scipot: pct((r as any).scipot), subfields: r.subfieldsString }));
    evidence = { kind: "experts", items };
    evidenceText = items.map((e, i) => `${i + 1}. ${e.name}${e.org ? ` (${e.org})` : ""} — commercial ${e.compot}, scientific ${e.scipot}${e.subfields ? `; ${e.subfields}` : ""}`).join("\n") || "No experts found.";
  } else if (c.intent === "impact" && c.abstract.length >= 60) {
    const [base, intd, cplx, def] = await Promise.all([
      scoreAbstract(c.abstract),
      scoreText("interdisciplinary", c.abstract), scoreText("complex_invention", c.abstract),
      opts.includeDefense ? scoreText("defense_impact", c.abstract) : Promise.resolve(null),
    ]);
    const scores: Record<string, number> = {
      commercial: pct(base.commercial), scientific: pct(base.scientific), social: pct(base.social),
      interdisciplinary: intd ? Math.round(intd.score * 100) : -1, complex_invention: cplx ? Math.round(cplx.score * 100) : -1,
    };
    if (opts.includeDefense && def) scores.defense = Math.round(def.score * 100);
    evidence = { kind: "impact", scores };
    evidenceText = Object.entries(scores).filter(([, v]) => v >= 0).map(([k, v]) => `${k}: ${v}/100`).join("\n");
  } else if (c.intent === "landscape") {
    const org = await orgIds(c.scope);
    const [{ papers }, { researchers }] = await Promise.all([
      searchPapers({ search: c.topic || question, organizations: org, order: "commPot", limit: 10 }),
      searchResearchers({ search: c.topic || question, organizations: org, order: "commPot", minPapers: 3, limit: 6 }),
    ]);
    const items = papers.slice(0, 8).map((p) => ({ title: p.title, year: p.year, compot: pct((p as any).compot), authors: (p.researcherNames || []).slice(0, 2).map((a) => a.res_name).join(", ") }));
    evidence = { kind: "papers", items };
    evidenceText = `Standout work:\n${items.map((p) => `- "${p.title}"${p.year ? ` (${p.year})` : ""} — commercial ${p.compot}${p.authors ? `; ${p.authors}` : ""}`).join("\n")}\n\nLeading researchers:\n${researchers.slice(0, 6).map((r) => `- ${r.name}${(r.orgsNames || [])[0] ? ` (${(r.orgsNames || [])[0]})` : ""}`).join("\n")}`;
  }

  if (c.intent === "other" || !evidenceText) {
    return { intent: c.intent, restate: c.restate, evidence, answer: "I answer questions about the research ecosystem — finding experts to collaborate with, scoring an idea or paper's potential (commercial, scientific, social, defense, interdisciplinary, complex), or mapping where a field stands and is heading. Try asking one of those, and for scoring, paste the abstract." };
  }
  const answer = await agentAnswerAI(question, c.restate, evidenceText);
  return { intent: c.intent, restate: c.restate, answer, evidence };
}
