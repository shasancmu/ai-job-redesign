// AI domain functions — research. Split from the former monolithic lib/ai.ts; the
// shared engine + interview primitives live in lib/ai/core.ts.
import { ADVICE_PRINCIPLES, BOTTOM_LINE_JSON } from "@/lib/advice";
import { MYOPIA_FRAMEWORK } from "@/lib/myopia";
import { MODEL, complete, completeJson, data0, expNudge, extractJson } from "@/lib/ai/core";


// ---- Domain Expertise Brief (Scientifiq) ----------------------------------
// Writes the narrative on top of already-aggregated Scientifiq data. The counts
// and scores are AUTHORITATIVE (computed from the API); the model interprets,
// it does not invent numbers or names not present in the data.
export async function domainBriefAI(input: {
  domain: string;
  scopeLabel: string;
  purpose: string; // fund | partner | recruit | assess | scout
  data: any;
  nudge?: string;
}): Promise<any> {
  const d = input.data || {};
  const experts = (d.topExperts || [])
    .slice(0, 10)
    .map((e: any, i: number) => `${i + 1}. ${e.name}${e.org ? ` (${e.org})` : ""} — sciPot ${Math.round(e.scipot ?? 0)}, commPot ${Math.round(e.compot ?? 0)} (0-100), ${e.totalPubs} pubs, ${e.acaCites} cites. Subfields: ${e.subfields || "n/a"}. ${e.bio ? "Bio: " + e.bio.slice(0, 240) : ""}`)
    .join("\n");
  const subs = (d.subfieldBreakdown || []).map((s: any) => `${s.name} (${s.count})`).join(", ");
  const years = (d.yearTrend || []);
  const trend = years.length ? `${years[0].year}: ${years[0].count} … ${years[years.length - 1].year}: ${years[years.length - 1].count} (fetched sample)` : "n/a";
  const standouts = (d.standoutPapers || []).slice(0, 5).map((p: any) => `"${p.title}"${p.year ? ` (${p.year})` : ""} — commPot ${Math.round(p.compot ?? 0)}, sciPot ${Math.round(p.scipot ?? 0)} (0-100)${p.authors ? ", " + p.authors : ""}`).join("\n");

  const dataBlock = `DOMAIN: ${input.domain}
SCOPE: ${input.scopeLabel}
Analyzed sample: the ${d.paperCount} most relevant papers and ${d.researcherCount} most relevant experts (semantic match). This is a relevance sample, NOT the full count of work in the scope.
Average potential across the sample: commercial ${Math.round(d.avgCommPot ?? 0)}, scientific ${Math.round(d.avgSciPot ?? 0)}, social ${Math.round(d.avgSocPot ?? 0)} (0-100 scale, a predictive percentile; higher = more predicted potential).
Sub-field composition: ${subs || "n/a"}.
Publication trajectory: ${trend}.

TOP EXPERTS (by scientific potential):
${experts || "(none)"}

STANDOUT WORK (highest combined potential):
${standouts || "(none)"}`;

  const purposeLine: Record<string, string> = {
    fund: "The reader is a FUNDER deciding where to direct grant money. Emphasize where the strength is real and fundable, the standout groups, and the gaps worth seeding.",
    partner: "The reader wants to PARTNER or collaborate. Emphasize who to approach and why, and where complementary strengths sit.",
    recruit: "The reader is RECRUITING talent. Emphasize the standout people and rising groups.",
    assess: "The reader is ASSESSING the scope's readiness/strength in this domain. Give an honest, balanced verdict with strengths and gaps.",
    scout: "The reader is SCOUTING for commercial opportunity. Emphasize the highest commercial-potential work and the people behind it.",
  };

  const system = `You are a research-intelligence analyst writing a briefing on a scope's (an institution's or region's) expertise in a technology domain, for a decision-maker. You are given AUTHORITATIVE data aggregated from Scientifiq (a platform that scores research for commercial, scientific, and social POTENTIAL, a forward-looking signal). ${purposeLine[input.purpose] || purposeLine.assess}

Rules:
- Interpret the data; do NOT invent numbers, people, papers, or subfields not present in it. Refer to experts and work by the names given.
- "Potential" scores are predictive (computed at publish), not citation counts; treat them as a forward-looking signal and say so where useful.
- Be honest about scale: if the domain is thin in this scope (few papers/experts), say so plainly rather than inflating.
- Ground the trajectory read in the publication trend provided, and note it is a fetched sample, not a full time series.
- Write plain text only in every string value: no markdown, no asterisks, no bold.

Lead with a BROAD SUMMARY of what was found, not a question. The headline is the single most important finding; the summary is the overview; the takeaway is the one implication for the reader's purpose (who to fund, partner with, recruit, or scout, and where the whitespace is).

Return STRICT JSON only, no prose outside it:
{
  "headline": "one strong sentence: the single most important finding about this scope's strength in the domain",
  "summary": "3-4 sentences summarizing what was found: the shape of the expertise, its scale, where it concentrates, and how strong it is. A decision-maker should grasp the whole picture from this alone.",
  "takeaway": "one sentence: the single most important implication or action for the reader, given their purpose",
  "themes": [ { "title": "a sub-area the expertise concentrates in", "detail": "1-2 sentences grounded in the data" } ],
  "standoutPeople": [ { "name": "an expert from the data", "why": "what makes them notable here, in one line" } ],
  "trajectory": "is this domain rising, steady, or thin in this scope, and what that implies",
  "gaps": ["sub-areas or capabilities that look under-represented or missing, worth building or funding"],
  "note": "one honest closing line, including any data caveats"
}${expNudge(input.nudge)}`;

  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: dataBlock },
  ], { json: true, temperature: 0.45, maxTokens: 3000 });
  return extractJson(raw);
}

// ---- Find Collaborators (Scientifiq matchmaking) --------------------------
// Ranks candidate researchers at the person's institution by genuine
// COMPLEMENTARITY to their described work, not similarity. The candidates and
// their scores are authoritative (from Scientifiq); the model judges fit.
// ---- Landscape family (Scientifiq domain scans) ---------------------------
// One function, four framings over the same aggregated domain data. Returns a
// shared shape rendered by DomainInsightReport.
const SCAN_PROMPTS: Record<string, { role: string; sections: string }> = {
  landscape: {
    role: "map a TECHNOLOGY LANDSCAPE for someone scanning a field: who leads it, who is commercializing it, and where the opportunity is",
    sections: `- "Who's leading" — the researchers/institutions publishing the strongest work (name them from the data)
- "Who's commercializing" — companies active in the space (from patent assignees) and how crowded it looks
- "White space" — subfields or angles with strong science but thin commercial/patent activity, i.e. openings`,
  },
  "deal-sourcing": {
    role: "source DEEP-TECH DEALS for an investor: find labs and researchers whose science is both high-quality AND commercializing (spin-out candidates before they raise)",
    sections: `- "Spin-out candidates" — the researchers to approach: high scientific potential AND commercial orientation (name them, one line why each)
- "Why now" — signals the field is at a commercialization inflection (patent activity, rising trend)
- "Watch-outs" — honest risks: crowded space, thin commercial signal, hype`,
  },
  scorecard: {
    role: "score an INSTITUTION's commercialization strength in a field: how commercially oriented its research is, its real strengths, and where it lags",
    sections: `- "Commercial orientation" — read the average commercial potential and patent activity: is this institution's work in the field commercially oriented or purely academic?
- "Strengths" — the specific researchers/subfields that are genuinely strong and commercializable (name them)
- "Gaps to close" — where the institution is thin relative to what a leading program would have`,
  },
  trajectory: {
    role: "read where a FIELD is going: which subfields are rising, where scientific and commercial value is concentrating, and what to bet on",
    sections: `- "Rising subfields" — from the subfield mix and year trend, what is growing
- "Where value concentrates" — which areas carry the high scientific and commercial potential
- "Bets to make" — concrete directions a researcher or funder should move toward now`,
  },
};

export async function domainScanAI(input: { mode: string; dataText: string }): Promise<any> {
  const cfg = SCAN_PROMPTS[input.mode] || SCAN_PROMPTS.landscape;
  const system = `You ${cfg.role}. You are given aggregated Scientifiq data for the domain: a relevance sample of researchers and papers with predictive potential scores (commercial/scientific/social, 0-100), the subfield mix, a year trend, and nearby patents with assignees (the companies active in the space). Judgment over recitation.

Rules:
- Use ONLY the data provided. Name researchers, institutions, and patent assignees exactly as they appear. Do not invent any.
- The scores are predictive signals, not proof. Counts are the analyzed sample, not a claimed universe total; say "in this sample" where relevant.
- Be specific and decision-useful. Fill the sections below.

Sections to fill (as the "sections" array, in this order):
${cfg.sections}

Return STRICT JSON only, plain text values (no markdown):
{
  "headline": "one-sentence read on the domain for this purpose",
  "summary": "2-3 sentences of context",
  "sections": [ { "title": "the section name", "items": ["3-5 concrete bullets, naming names from the data"] } ],
  "verdict": "one honest closing line"
}`;
  return completeJson([
    { role: "system", content: system },
    { role: "user", content: input.dataText },
  ], { temperature: 0.5, maxTokens: 2600 });
}

// ---- Diligence the Science (Scientifiq, investor read) --------------------
// Given a startup's claimed technology (abstract), read whether the underlying
// science is real, strong, and commercializing, from Scientifiq's scores, the
// comparable literature, and the patent landscape. Founder-market-science fit.
export async function diligenceScienceAI(input: {
  abstract: string; context?: string; scores: any;
  comparables: { title: string; year?: number; comm: number; authors?: string }[];
  patents: { title: string; year?: number; assignees: string }[];
}): Promise<any> {
  const s = input.scores || {};
  const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);
  const scoreLine = `Scientific potential ${pct(s.scientific)}/100 (${s.scientific?.stars ?? "?"}★), commercial ${pct(s.commercial)}/100 (${s.commercial?.stars ?? "?"}★), social ${pct(s.social)}/100.`;
  const comps = (input.comparables || []).slice(0, 8).map((c) => `"${c.title}"${c.year ? ` (${c.year})` : ""} commPot ${Math.round(c.comm)}${c.authors ? ", " + c.authors : ""}`).join("\n");
  const pats = (input.patents || []).slice(0, 8).map((p) => `"${p.title}"${p.year ? ` (${p.year})` : ""}${p.assignees ? " — assignees: " + p.assignees : ""}`).join("\n");

  const system = `You are an investor's technical diligence analyst. Given a startup's CLAIMED technology, assess whether the underlying science is real, strong, and close to commercialization, using Scientifiq's predictive scores, comparable published science, and the nearby patent landscape. Be skeptical and specific; the reader is deciding whether to spend more time.

Rules:
- Judge the SCIENCE, not the pitch. Is this a real, established area, a genuinely novel claim, or thin/hand-wavy? Use the comparable papers as evidence.
- Read maturity from patents: an active patent landscape (named assignees) means the field is commercializing; sparse patents mean early or unproven.
- Note who actually leads this space (from the comparable authors). If a founding team is described in the context, say whether they appear to be among the real leaders or not, honestly, without inventing facts.
- Do NOT invent companies, people, or numbers not in the data.

Return STRICT JSON only, plain text values (no markdown):
{
  "headline": "one-line read on the science's credibility and readiness",
  "isReal": "2-3 sentences: is the underlying science real, established, novel, or thin? cite the comparable evidence",
  "maturity": "1-2 sentences: how close to commercialization, read from patent activity",
  "leaders": "who actually leads this space, and (if a team is described) whether they appear to be among them",
  "green": ["concrete green flags"],
  "red": ["concrete red flags or questions to probe in deeper diligence"],
  "verdict": "one of: Strong science | Mixed, dig deeper | Weak / unproven, with one line why"
}`;

  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `CLAIMED TECHNOLOGY:\n${input.abstract.slice(0, 5000)}\n\n${input.context ? `TEAM / CONTEXT: ${input.context.slice(0, 800)}\n\n` : ""}SCORES: ${scoreLine}\n\nCOMPARABLE SCIENCE:\n${comps || "(none found)"}\n\nNEARBY PATENTS:\n${pats || "(none found)"}` },
  ], { temperature: 0.4, maxTokens: 2400 });
}

// ---- Find a Technical Co-Founder / CTO (Scientifiq, people) ----------------
// Same candidate machinery as Find Collaborators, but ranks for a founder
// hunting a technical co-founder/CTO: deep in the venture's core technology,
// commercially oriented, ideally with patent-cited work (can build, not just
// publish). Same output shape so it reuses CollaboratorsReport.
export async function cofounderAI(input: {
  focus: string;
  needs: string[];
  scopeLabel: string;
  candidates: { index: number; name: string; org: string; subfields: string; bio: string; scipot: number; compot: number; titles: string }[];
}): Promise<any> {
  const list = input.candidates
    .map((c) => `[${c.index}] ${c.name} (${c.org}) sci ${Math.round(c.scipot)}, comm ${Math.round(c.compot)}. Subfields: ${c.subfields || "n/a"}. ${c.bio ? "Bio: " + c.bio.slice(0, 240) : ""} ${c.titles ? "Recent: " + c.titles.slice(0, 150) : ""}`)
    .join("\n");
  const needs = input.needs?.length ? input.needs.join("; ") : "a strong technical co-founder";

  const system = `You help a founder find a TECHNICAL CO-FOUNDER or CTO for a deep-tech venture. You are given the venture's technology and a list of candidate researchers at ${input.scopeLabel} (semantically related, with Scientifiq potential scores: sci = scientific potential, comm = commercial potential of their work). Judgment, not search.

What matters for a technical co-founder:
- DEPTH in the venture's core technology, someone who can actually build it.
- COMMERCIAL orientation, prefer higher commercial-potential (comm) scores and any signal their work is applied or patent-adjacent, over pure basic science. A brilliant researcher whose work never leaves the lab is a weaker co-founder.
- Seniority/leadership to own R&D, and covering a technical area the (assumed non-technical) founder lacks.
- Fit what the founder asked for: ${needs}.
- Only use candidates from the list; refer to each by its [index] and exact name. Do not invent people. Leave out weak fits.

${ADVICE_PRINCIPLES}
Here, the decision to shift is who to approach FIRST and how to open the conversation.

Return STRICT JSON only, plain text values (no markdown):
{
  ${BOTTOM_LINE_JSON},
  "matches": [ { "index": <number from the list>, "name": "exact name", "why": "why they'd make a strong technical co-founder for THIS venture, specific", "propose": "the concrete role/relationship to propose (co-founder, CTO, advisor-to-start)", "intro": "a 2-3 sentence first-person outreach message the founder could send" } ],
  "note": "one honest line, including that these are from a relevance sample and scores are predictive"
}
Rank best-first, at most 7.`;

  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `THE VENTURE'S TECHNOLOGY:\n${input.focus.slice(0, 4000)}\n\nWHAT THEY NEED: ${needs}\n\nCANDIDATES at ${input.scopeLabel}:\n${list}` },
  ], { temperature: 0.5, maxTokens: 3200 });
}

export async function collaboratorsAI(input: {
  focus: string;
  connectionKinds: string[];
  scopeLabel: string;
  candidates: { index: number; name: string; org: string; subfields: string; bio: string; scipot: number; compot: number; titles: string }[];
  nudge?: string;
}): Promise<any> {
  const list = input.candidates
    .map((c) => `[${c.index}] ${c.name} (${c.org}) sci ${Math.round(c.scipot)}, comm ${Math.round(c.compot)}. Subfields: ${c.subfields || "n/a"}. ${c.bio ? "Bio: " + c.bio.slice(0, 260) : ""} ${c.titles ? "Recent: " + c.titles.slice(0, 160) : ""}`)
    .join("\n");
  const kinds = input.connectionKinds?.length ? input.connectionKinds.join("; ") : "any productive collaboration";

  const system = `You help a researcher find COMPLEMENTARY collaborators at their own institution (${input.scopeLabel}). You are given their described work and a list of candidate researchers there (semantically related, with authoritative Scientifiq potential scores). Your job is judgment, not search.

What matters:
- COMPLEMENTARITY over similarity. The best collaborator ADDS something the person's work lacks: a method or technique they don't have, a domain to apply their work in, a clinical or field partner, a co-PI who covers a different piece, or a data source. Someone who does exactly the same thing is the LEAST useful. Prefer candidates in a DIFFERENT sub-field who are still relevant, the people the person is least likely to already know.
- Fit the kind(s) of connection they asked for: ${kinds}.
- Only use candidates from the list; refer to each by its [index] and exact name. Do not invent people. If a candidate is clearly just the same specialty with nothing to add, leave them out.
- Ground every "why" in the specific complementarity (what they bring that the person doesn't).

${ADVICE_PRINCIPLES}
Here, the decision to shift is who to reach out to FIRST and what to say.

Return STRICT JSON only, plain text values (no markdown):
{
  ${BOTTOM_LINE_JSON},
  "matches": [ { "index": <number from the list>, "name": "exact name", "why": "what they complement, specific to the person's work", "propose": "the concrete collaboration to propose", "intro": "a 2-3 sentence first-person intro message the person could send" } ],
  "note": "one honest line, including that these are drawn from a relevance sample"
}
Rank matches best-first, at most 7.${expNudge(input.nudge)}`;

  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: `THEIR WORK:\n${input.focus.slice(0, 4000)}\n\nWHAT THEY WANT: ${kinds}\n\nCANDIDATES at ${input.scopeLabel}:\n${list}` },
  ], { json: true, temperature: 0.5, maxTokens: 3200 });
  return extractJson(raw);
}

// ---- Score My Invention (Scientifiq potential scoring) --------------------
// The free wedge for the deep-tech line: score any abstract/idea for its
// commercial, scientific, and social potential, then read the scores and say
// how to raise them. Just scoreAbstract + an interpretive write-up.
export async function scoreInventionAI(input: { abstract: string; title?: string; scores: any; extra?: Record<string, number> }): Promise<any> {
  const s = input.scores || {};
  const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);
  const scoreLine = `Commercial ${pct(s.commercial)}/100 (${s.commercial?.stars ?? "?"}★), Scientific ${pct(s.scientific)}/100 (${s.scientific?.stars ?? "?"}★), Social ${pct(s.social)}/100 (${s.social?.stars ?? "?"}★). These are Scientifiq's predictive potential scores for THIS abstract, benchmarked against the field.`;
  // The deeper dimensions from our own trained models, when the estimator returned them.
  const e = input.extra || {};
  const deepBits: string[] = [];
  if (typeof e.complex_invention === "number" && e.complex_invention >= 0) deepBits.push(`Complex-invention ${e.complex_invention}/100 (how much it spans multiple technical disciplines)`);
  if (typeof e.interdisciplinary === "number" && e.interdisciplinary >= 0) deepBits.push(`Interdisciplinary ${e.interdisciplinary}/100 (how likely it is to influence research outside its home field)`);
  if (typeof e.defense === "number" && e.defense >= 0) deepBits.push(`Defense relevance ${e.defense}/100 (potential relevance to government / national-security technology)`);
  const deepLine = deepBits.length ? `\n\nDEEPER MODEL SCORES: ${deepBits.join("; ")}.` : "";

  const system = `You interpret Scientifiq's predictive potential scores for one invention or research idea, for the person who wrote it. You are given the abstract and its commercial / scientific / social potential (0-100 and stars)${deepBits.length ? ", plus deeper dimensions from our own trained models (complex-invention, interdisciplinary, and where present defense relevance)" : ""}. Be specific and honest: the scores are a forward-looking signal, not proof. If a score is low, say so plainly and explain what a low score means here, do not force optimism.

The "how to raise it" advice must be concrete and specific to THIS idea: sharper framing, a more valuable application, a clearer beneficiary, a bigger or better-defined market, a more rigorous claim. Never suggest fabricating results.

Return STRICT JSON only, plain text values (no markdown):
{
  "headline": "one-sentence read on this idea's potential",
  "strongest": "which potential is strongest, and what that implies for what to do with it",
  "readCommercial": "1-2 sentences interpreting the commercial score for this idea",
  "readScientific": "1-2 sentences interpreting the scientific score",
  "readSocial": "1-2 sentences interpreting the social score",${typeof e.complex_invention === "number" && e.complex_invention >= 0 ? `\n  "readComplex": "1-2 sentences interpreting the complex-invention score for this idea (does it genuinely span multiple technical disciplines, and what that means)",` : ""}${typeof e.interdisciplinary === "number" && e.interdisciplinary >= 0 ? `\n  "readInterdisciplinary": "1-2 sentences interpreting the interdisciplinary score (how likely to influence fields beyond its own, and who that reaches)",` : ""}${typeof e.defense === "number" && e.defense >= 0 ? `\n  "readDefense": "1-2 sentences interpreting the defense-relevance score (potential relevance to government / national-security technology, honestly, not inflated)",` : ""}
  "raise": ["3-4 concrete, specific ways to strengthen or reframe THIS idea to raise its potential, especially commercial"],
  "whoCares": ["2-3 specific types of people or organizations who would care if this delivers"],
  "verdict": "one of: Pursue | Develop further | Weak case, followed by one line on why"
}`;

  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `INVENTION${input.title ? ` — ${input.title}` : ""}:\n${input.abstract.slice(0, 5000)}\n\nSCORES: ${scoreLine}${deepLine}` },
  ], { temperature: 0.5, maxTokens: 1500 });
}

// ---- Position My Research (Scientifiq, researcher framing) ----------------
// Same scoring engine as Score My Invention, but for a researcher deciding how
// to frame a paper/idea for impact: emphasize scientific + social potential and
// reframings that raise citation odds and fundability, not commercialization.
export async function positionResearchAI(input: { abstract: string; title?: string; scores: any; extra?: Record<string, number> }): Promise<any> {
  const s = input.scores || {};
  const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);
  const scoreLine = `Scientific ${pct(s.scientific)}/100 (${s.scientific?.stars ?? "?"}★), Social ${pct(s.social)}/100 (${s.social?.stars ?? "?"}★), Commercial ${pct(s.commercial)}/100 (${s.commercial?.stars ?? "?"}★). Scientifiq's predictive potential for THIS abstract, benchmarked against the field.`;
  // The deeper dimensions from our own trained models, when the estimator returned them.
  const e = input.extra || {};
  const deepBits: string[] = [];
  if (typeof e.complex_invention === "number" && e.complex_invention >= 0) deepBits.push(`Complex-invention ${e.complex_invention}/100 (how much it spans multiple technical disciplines)`);
  if (typeof e.interdisciplinary === "number" && e.interdisciplinary >= 0) deepBits.push(`Interdisciplinary ${e.interdisciplinary}/100 (how likely it is to influence research outside its home field)`);
  if (typeof e.defense === "number" && e.defense >= 0) deepBits.push(`Defense relevance ${e.defense}/100 (potential relevance to government / national-security technology)`);
  const deepLine = deepBits.length ? `\n\nDEEPER MODEL SCORES: ${deepBits.join("; ")}.` : "";

  const system = `You advise a researcher on how to POSITION a paper or research idea for maximum impact, using Scientifiq's predictive potential scores. You are given the abstract and its scientific / social / commercial potential${deepBits.length ? ", plus deeper dimensions from our own trained models (complex-invention, interdisciplinary, and where present defense relevance)" : ""}. Focus on scholarly and societal impact: what would make this more likely to be read, cited, funded, and to matter, not on commercialization.

The "how to raise it" advice must be concrete and specific to THIS work: a sharper contribution claim, a more general or more surprising framing, a clearer beneficiary, connecting to a hotter conversation, a stronger null it overturns. Never suggest overclaiming or fabricating.

Return STRICT JSON only, plain text values (no markdown):
{
  "headline": "one-sentence read on this work's potential impact",
  "strongest": "which potential is strongest, and what that implies for how to position it",
  "readCommercial": "1-2 sentences interpreting the commercial score",
  "readScientific": "1-2 sentences interpreting the scientific score",
  "readSocial": "1-2 sentences interpreting the social score",${typeof e.complex_invention === "number" && e.complex_invention >= 0 ? `\n  "readComplex": "1-2 sentences interpreting the complex-invention score for this work (does it genuinely span multiple technical disciplines, and what that means for positioning)",` : ""}${typeof e.interdisciplinary === "number" && e.interdisciplinary >= 0 ? `\n  "readInterdisciplinary": "1-2 sentences interpreting the interdisciplinary score (how likely to influence fields beyond its own, and which audiences that reaches)",` : ""}${typeof e.defense === "number" && e.defense >= 0 ? `\n  "readDefense": "1-2 sentences interpreting the defense-relevance score (potential relevance to government / national-security research, honestly, not inflated)",` : ""}
  "raise": ["3-4 concrete ways to reframe or strengthen THIS work to raise its scholarly and societal potential"],
  "whoCares": ["2-3 specific audiences (fields, funders, communities) who would care if this lands"],
  "verdict": "one of: Position for a top venue | Strengthen the contribution | Reframe first, followed by one line on why"
}`;

  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `WORK${input.title ? ` — ${input.title}` : ""}:\n${input.abstract.slice(0, 5000)}\n\nSCORES: ${scoreLine}${deepLine}` },
  ], { temperature: 0.5, maxTokens: 1500 });
}

// ---- Rank Our Disclosures (Scientifiq, batch scoring) ---------------------
// The app scores + ranks a batch of disclosures by commercial potential; this
// writes the portfolio read: which to prioritize and why.
export async function rankDisclosuresAI(input: { items: { label: string; comm: number; sci: number; soc: number }[] }): Promise<any> {
  const rows = input.items.map((it, i) => `${i + 1}. ${it.label} — commercial ${it.comm}/100, scientific ${it.sci}/100, social ${it.soc}/100`).join("\n");
  const system = `You advise a university tech-transfer office that has scored a BATCH of disclosures on Scientifiq's predictive potential (0-100). You are given the disclosures with their commercial/scientific/social scores, already ranked by commercial potential. Give a portfolio read: which few to prioritize for patenting/licensing and why, and any that are weak commercially but strong scientifically (worth a different path). Be decisive and honest; use only the scores given.

Return STRICT JSON only, plain text values (no markdown):
{
  "summary": "2-3 sentences on the batch overall (how strong, where the value concentrates)",
  "prioritize": ["the 1-3 disclosures to act on first, each named, with one line why"],
  "watch": ["0-2 that are commercially weak but scientifically strong, or otherwise worth a note"],
  "verdict": "one honest closing line"
}`;
  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `Disclosures (ranked by commercial potential):\n${rows}` },
  ], { temperature: 0.4, maxTokens: 1200 });
}

// ---- Defense Impact (Scientifiq, national-security relevance) --------------
// The RFP's GPT-4 chain-of-thought scorer: estimate how likely a piece of
// science is to influence government / defense-relevant technology, grounded in
// real patent-citation evidence when a DOI is supplied. A research-MAPPING
// score, not a targeting tool — the prompt is held to that framing.
export async function defenseImpactAI(input: {
  abstract: string;
  title?: string;
  scores: any;             // { commercial:{raw,stars}, scientific, social }
  evidenceSummary: string; // from evidenceForPrompt() — hard patent signal or its absence
  modelScore?: { score: number; stars: number } | null; // the SciBERT estimator's score, when available
}): Promise<any> {
  const s = input.scores || {};
  const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);
  const scoreLine = `For context, Scientifiq's predictive potential for THIS abstract: commercial ${pct(s.commercial)}/100 (${s.commercial?.stars ?? "?"}★), scientific ${pct(s.scientific)}/100 (${s.scientific?.stars ?? "?"}★), social ${pct(s.social)}/100 (${s.social?.stars ?? "?"}★).`;
  const modelLine = input.modelScore
    ? `The trained SciBERT defense-impact model scored this ${Math.round(input.modelScore.score * 100)}/100. This is the AUTHORITATIVE score — set "scorePct" to exactly ${Math.round(input.modelScore.score * 100)} and write every part of your read (domains, pathways, confidence, verdict) consistent with it. Do NOT substitute your own number.`
    : `No trained-model score is available; produce your own honest "scorePct" estimate from the abstract and evidence.`;

  const system = `You estimate the DEFENSE IMPACT POTENTIAL of a piece of science: how likely this work is to influence technologies relevant to government, national-security, or defense applications (e.g. aerospace, autonomy/robotics, sensing & C4ISR, advanced materials & energetics, cyber & secure communications, directed energy, space, biodefense).

Define it precisely, mirroring the commercial-potential measure (Masclans, Hasan & Cohen 2025), where commercial potential is the predicted likelihood that a RENEWED PATENT cites the article. Here, defense impact is the analogous likelihood that a patent assigned to a DEFENSE ENTITY (a defense prime, a national lab, or a government/defense body) — or work under defense-agency funding — builds on this article. Score in that spirit: an ex-ante, forward-looking signal read from the abstract, not proof.

This is a research-MAPPING score, in the same spirit as the commercial-potential score — a transparent, uncertainty-bounded lens on where science flows. It is built from public bibliometric signals. Do NOT describe weaponization steps, operational use, or how to build anything; reason only about topical relevance and likely translation pathways at the level of published research.

You are given the abstract, its Scientifiq potential scores (context), and any HARD EVIDENCE from patent-citation data. Ground your estimate: if real defense-linked patent citations exist, score higher with higher confidence; if the paper has commercial translation but no defense assignees, or no citations at all, keep the estimate and confidence honest. Be willing to say defense relevance is minimal.

Return STRICT JSON only, plain text values (no markdown):
{
  "headline": "one honest sentence on this work's defense-impact potential",
  "scorePct": 0-100 integer estimate of defense-impact potential,
  "stars": 1-5 integer matching the score,
  "confidence": "High | Moderate | Low — reflecting evidence strength and specificity",
  "confidenceWhy": "one line on what drives the confidence (evidence present/absent, how specific the science is)",
  "domains": [{ "name": "a defense/national-security domain it plausibly touches", "why": "one line on the connection" }],
  "pathways": ["2-4 concrete, non-operational ways this science could feed a defense-relevant technology (translation pathways, not instructions)"],
  "dualUse": "one honest paragraph on the dual-use character of this work — that it maps relevance, not intent, and where the civilian/defense line sits",
  "whoCares": ["2-3 agencies, programs, or primes that would plausibly track work like this"],
  "verdict": "one of: Strong defense relevance | Plausible dual-use | Minimal defense relevance, followed by one line why"
}`;

  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `WORK${input.title ? ` — ${input.title}` : ""}:\n${input.abstract.slice(0, 5000)}\n\n${scoreLine}\n\nMODEL: ${modelLine}\n\nEVIDENCE: ${input.evidenceSummary}` },
  ], { temperature: 0.4, maxTokens: 1500 });
}

// ---- Research Agent (Scientifiq, unified NL entry) ------------------------
// Two-step: classify the question + extract params, then synthesize an answer
// grounded ONLY in the evidence the route retrieved from the platform.
export async function agentClassifyAI(question: string): Promise<any> {
  const system = `You route a question to one capability of a science-intelligence platform (Scientifiq) and extract its parameters. Return STRICT JSON only:
{
  "intent": "experts" | "impact" | "landscape" | "other",
  "topic": "the core technology, field, or topic, in a few words (or '')",
  "scope": "an institution or region named in the question, else '' for global",
  "abstract": "if the user pasted a paper/idea/abstract to evaluate, put its text here, else ''",
  "restate": "one plain-language sentence restating what they want"
}
Intents:
- experts: who works on X / who should I collaborate with / find people / who leads.
- impact: score THIS idea or paper's potential (they pasted or described a specific piece of work).
- landscape: map a field / where is X heading / what companies are active / the state of an area.
- other: anything else.`;
  return completeJson([{ role: "system", content: system }, { role: "user", content: question.slice(0, 4000) }], { temperature: 0.1, maxTokens: 500 });
}

export async function agentAnswerAI(question: string, restate: string, evidenceText: string): Promise<string> {
  const system = `You are a research-intelligence analyst for the Scientifiq platform. Answer the user's question using ONLY the evidence provided (real results from the platform's data + models). Be specific, concise, and honest; cite the names and numbers from the evidence. Do not invent people, papers, or scores. If the evidence is thin, say so. Plain text — a few short paragraphs or a tight list.`;
  const user = `QUESTION: ${question}\n\nWHAT THEY WANT: ${restate}\n\nEVIDENCE (from the platform):\n${evidenceText}`;
  return complete([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.4, maxTokens: 900 });
}

// ---- ExplainAI (Scientifiq, plain-language translation) -------------------
// One paper -> plain-language framings for distinct audiences. The proposal's
// "translate complex research into plain language" deliverable.
export async function explainAI(input: { abstract: string; title?: string }): Promise<any> {
  const system = `You translate a piece of research into plain language for several audiences. You are given an abstract. Be accurate and concrete; never overclaim or invent findings. Keep the plain-language parts jargon-free — if a technical term is unavoidable, translate it.

Return STRICT JSON only, plain text values (no markdown):
{
  "gist": "one plain sentence: what this work is and why it might matter, no jargon",
  "audiences": [
    { "who": "Policymaker", "care": "one line on why they'd care", "plain": "2-3 plain sentences: the real-world problem it speaks to and the potential public benefit or risk" },
    { "who": "Investor or industry R&D", "care": "one line", "plain": "the commercial angle — what could be built, for whom, and what is still unproven" },
    { "who": "A researcher in another field", "care": "one line", "plain": "the transferable idea or method they could borrow, and how it connects to their work" },
    { "who": "The public", "care": "one line", "plain": "what it means for everyday life, in concrete terms a curious non-expert would follow" }
  ],
  "jargon": [ { "term": "a key technical term from the abstract", "plain": "its plain-language meaning" } ]
}`;
  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `RESEARCH${input.title ? ` — ${input.title}` : ""}:\n${input.abstract.slice(0, 5000)}` },
  ], { temperature: 0.5, maxTokens: 1700 });
}

// ---- Impact Optimizer (Scientifiq, missing-science discovery) --------------
// What SCIENCE is missing so a paper reaches a target potential? The AI proposes
// concrete scientific extensions (not rewordings), writes each as the abstract it
// would become IF that work were done, the models score them, and we rank the
// missing pieces by predicted gain. A research-direction prioritizer.
const TARGET_LABEL: Record<string, string> = {
  commercial: "commercial potential (how likely industry is to build on this work)",
  scientific: "scientific potential (how likely it is to attract academic citations)",
  social: "social-impact potential",
  defense: "defense / national-security relevance",
  complex_invention: "complex-invention potential (feeding complex, multi-disciplinary technology)",
  interdisciplinary: "interdisciplinary potential (influence beyond its own field)",
};

export async function proposeExtensionsAI(abstract: string, target: string, n: number, goal?: { current: number; target: number }): Promise<any> {
  const label = TARGET_LABEL[target] || target;
  const goalLine = goal
    ? `\nGOAL (return-to-go): the current ${label} score is ${goal.current}/100; aim to reach ${goal.target}/100 — ${Math.max(0, goal.target - goal.current)} points to close. Favor the extensions most likely to make the biggest CREDIBLE jump toward that goal, not incremental polish.`
    : "";
  const system = `You are a research strategist. Given an abstract, propose ${n} concrete SCIENTIFIC EXTENSIONS — pieces of work the authors could actually DO next — that would most raise this work's ${label}.${goalLine}

These are additions to the SCIENCE, not rewordings. Examples of moves: demonstrate the method on real / at-scale / clinical data; extend it to a new application or domain; add a missing experiment, mechanism, or causal result; integrate it with another technology to enable a concrete product; validate against a real benchmark or against incumbents; show generality across cases.

The abstract you are given may already incorporate earlier extensions — propose the NEXT most valuable additions BEYOND what it already states, not things it already claims. For EACH extension, write the abstract AS IT WOULD READ if that work were completed — a plausible near-future version of the paper that includes the new science — so its potential can be measured. Be realistic and specific to THIS work; do not fabricate implausible breakthroughs, and keep the prior findings intact.

Return STRICT JSON only:
{ "extensions": [ { "gap": "the specific missing science — what to DO, one line", "abstract": "the abstract as it would read once that work is done" } ] }`;
  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `ORIGINAL ABSTRACT:\n${abstract.slice(0, 5000)}` },
  ], { temperature: 0.75, maxTokens: 3200 });
}

export async function researchRoadmapAI(input: { abstract: string; target: string; baseline: number; ranked: { gap: string; score: number; delta: number }[] }): Promise<any> {
  const label = TARGET_LABEL[input.target] || input.target;
  const rows = input.ranked.map((r, i) => `${i + 1}. (${input.baseline}→${r.score}, +${r.delta}) ${r.gap}`).join("\n");
  const system = `You advise a research team on what to work on next to raise their work's ${label}. You are given the current abstract and a list of proposed scientific extensions, each with the potential score the model predicts the paper WOULD reach if that work were done (baseline is ${input.baseline}/100). Write a short, honest research roadmap: which missing science is highest-leverage and why, in order.

Return STRICT JSON only, plain text:
{
  "headline": "one sentence: the single most valuable missing piece of science",
  "priority": [ { "step": "the scientific work to do", "why": "why it moves the target, and how hard it is" } ],
  "caution": "one line: predicted gains assume the work succeeds; the added science is hypothetical, a prioritization aid not a promise"
}`;
  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `CURRENT ABSTRACT:\n${input.abstract.slice(0, 3000)}\n\nPROPOSED EXTENSIONS (predicted score if done):\n${rows}` },
  ], { temperature: 0.4, maxTokens: 1400 });
}

// A skeptical reviewer that flags impact-inflation vs. real science.
export async function critiqueChainAI(input: { original: string; target: string; gaps: string[] }): Promise<any> {
  const label = TARGET_LABEL[input.target] || input.target;
  const list = input.gaps.map((g, i) => `${i + 1}. ${g}`).join("\n");
  const system = `You are a strict, skeptical domain reviewer. You are given an original abstract and a sequence of proposed scientific extensions meant to raise its ${label}. For EACH extension, judge honestly: is it (a) a legitimate, plausible next piece of science a competent group could actually do, that would genuinely raise real-world impact — or (b) does it mostly ADD IMPACT-SOUNDING LANGUAGE (scale, economics, "industrial", "at scale") without adding real scientific capability, i.e. gaming the score? Mark legit=false if it is vague, hand-wavy, unfalsifiable, or inflates framing more than substance.

Return STRICT JSON only, one verdict per extension IN ORDER:
{ "verdicts": [ { "legit": true, "concern": "one line, empty if legit" } ] }`;
  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `ORIGINAL:\n${input.original.slice(0, 2500)}\n\nPROPOSED EXTENSIONS:\n${list}` },
  ], { temperature: 0.2, maxTokens: 1000 });
}

// Twin-grounding (AlphaFold-style co-variation): given REAL papers from the same
// research neighborhood, split by outcome, name the factors that empirically
// separate the high-outcome group — grounded ONLY in what the titles/keywords show.
export async function groundLeversAI(input: { target: string; high: { title: string; keywords?: string }[]; low: { title: string; keywords?: string }[] }): Promise<any> {
  const label = TARGET_LABEL[input.target] || input.target;
  const fmt = (arr: { title: string; keywords?: string }[]) => arr.slice(0, 8).map((p, i) => `${i + 1}. ${p.title}${p.keywords ? ` [${p.keywords}]` : ""}`).join("\n");
  const system = `You are analyzing REAL papers from one tight research neighborhood. The HIGH group scored high on ${label}; the LOW group scored low. These are matched twins — same topic, different outcome. Name 2–4 concrete scientific FACTORS that distinguish the high-outcome group from the low one. Use ONLY what is visible in the titles and keywords — do not invent findings. Each factor must be an actionable research choice (e.g. "demonstrates a device/application", "reports quantitative performance", "targets a named end-use"), not a vague theme.

Return STRICT JSON only:
{ "levers": [ { "name": "short factor (≤6 words)", "why": "one line: what the high group shows that the low group doesn't" } ] }`;
  return completeJson([
    { role: "system", content: system },
    { role: "user", content: `HIGH ${label} (real twins):\n${fmt(input.high)}\n\nLOW ${label} (real twins):\n${fmt(input.low)}` },
  ], { temperature: 0.2, maxTokens: 700 });
}

// The institution's "presence" (the Ritz "Mystique"): a warm, remembering voice
// that greets a returning learner by what they were last doing and reflects their
// growth back — witnessing, not processing. Grounded ONLY in the learner's own facts.
export async function presenceGreetingAI(input: {
  presenceName: string; voice?: string; orgName: string; learnerName: string;
  lastModule?: string; modulesDone: string[]; goal?: string; firstSeen?: string;
  count: number; returningAfterDays?: number;
}): Promise<any> {
  const system = `You are ${data0(input.presenceName, 60)}, the voice of ${data0(input.orgName, 80)} — the institution as a someone who remembers this person.${input.voice ? ` Voice guidance: ${data0(input.voice, 400)}` : ""}

Write in the first person, briefly, and reference a real, specific detail about THIS person — the specificity is the whole point; warmth comes from being remembered, not from adjectives.

Tone rules (important — do NOT be cheesy, do NOT perform intimacy):
- Understated. You are addressing a capable adult, not cheering a child.
- No exclamation marks. No emoji. No gushing. Ban these: "so great/wonderful to see you", "amazing", "incredible", "proud of you", "you've got this", "keep it up", "journey", "welcome back!" with an exclamation.
- NEVER interpret or psychoanalyze them, and NEVER connect the present to their past or "how they started". No patterns, arcs, or "journeys". Ban phrases like "which tracks with", "that fits with", "which makes sense given", "as you always do". Do not read meaning into their history — just state what is.
- Say the true, specific thing plainly. Dry is fine. Restraint reads as respect.
- Short — ONE sentence. No filler warmth, no motivational filler, no cleverness.
- Do not invent anything beyond the facts given.

Return STRICT JSON only:
{ "greeting": "ONE short, plain sentence — a simple welcome that may note what they're currently or last working on, stated as a plain fact (e.g. 'You're mid-way through a paper deconstruction.'). No interpretation, no reference to their past, no editorializing.", "remembers": ["3-5 short, factual first-person notes of what you remember — their focus, what's changed, milestones. No praise, just what's true."], "hook": "one line: a specific, low-key seed for a future unprompted touch" }`;
  const facts = [
    `Name: ${input.learnerName}`,
    input.lastModule ? `Last worked on: ${input.lastModule}` : "",
    input.modulesDone.length ? `Has worked through: ${input.modulesDone.slice(0, 12).join(", ")}` : "New here — little history yet.",
    input.goal ? `Their stated goal: ${input.goal}` : "",
    input.firstSeen ? `First joined: ${input.firstSeen}` : "",
    `Modules finished: ${input.count}`,
    input.returningAfterDays ? `Returning after ~${input.returningAfterDays} days away.` : "",
  ].filter(Boolean).join("\n");
  return completeJson([{ role: "system", content: system }, { role: "user", content: facts }], { temperature: 0.7, maxTokens: 500 });
}

// Understand ONE person — so a teacher can care from understanding, not data.
// Explicitly not a sales/conversion read: it describes a human and what would
// help THEM, never how to extract value from them.
export async function understandPersonAI(input: { name: string; orgName: string; who: string; journey: string; peers?: string; work?: string; portrait?: string }): Promise<any> {
  const system = `You are an unusually perceptive faculty director reading one of your people, for the instructor who works with them. Read the PERSON, not the problem. If they gave a self-portrait (their own words about who they are and where they're headed), that is your TRUEST evidence — lead with it. Their exercise work is a further window into how they think — use it as evidence too, then abstract UP to what it reveals about them as a thinker and professional in general: the mental habits and dispositions that will recur across their work and life, far beyond any one task.

Do not get pulled into solving their specific problem or diagnosing the domain. The instructor wants to understand Mark, not Mark's audit process. The task is the latest instance of a pattern — name the pattern.

Calibrate the altitude carefully. Too specific (a diagnosis of their project): "the case scoring is weak; he should measure X." Too generic (a horoscope that fits anyone): "he's a pragmatic problem-solver who values results." The target is a sharp, portable read of THIS person that a random person would NOT fit, grounded in a real signal — e.g.: "He senses when something is shallow before he can name why, and reaches for efficiency because it's the move he has words for. His edge is learning to name the deeper thing he already feels." That is a read of the person that travels with them.

Find the block: the general pattern in how they think that quietly caps them — the reflex that will keep showing up. Find the unlock: the transferable capability, reframe, or habit that would change their trajectory, in their work AND their life and career.

Hard rules:
- BE SHORT. Terse, high-signal. No hedging, no filler, no restating the task.
- Abstract to disposition and thinking-pattern — portable, not domain-locked — but stay specific to THIS person and grounded in evidence. No horoscopes.
- "Ask them what they meant" is a last resort, not the insight. Commit to a read.
- Never invent biography; if there's little to go on, say so in one line and stop.
- No sales/retention/funnel framing. No flattery.

Return STRICT JSON only:
{
  "who": "1-2 plain sentences: who they are as a thinker/professional — their disposition — inferred from how they engage, not from their job title.",
  "blocker": "2-3 sentences: the general pattern in how they think that limits them — the reflex that will recur across their career, of which this task is just the latest instance. Portable and specific to them, not a horoscope.",
  "unlock": "2-3 sentences: the transferable capability, reframe, or habit that would change their trajectory — in their work and their life/career, beyond this one problem.",
  "needs": ["2-3 moves that build that general capability. A domain example is fine as illustration, but the point is the portable skill, not fixing this project."],
  "one_thing": "one sentence: the single highest-leverage thing the instructor could do to help this person grow."
}`;
  const facts = [
    `Person: ${data0(input.name, 80)}`, `Institution: ${data0(input.orgName, 80)}`,
    input.portrait ? `\nWHAT THEY TOLD US ABOUT THEMSELVES (their own words — your truest evidence):\n${data0(input.portrait, 2500)}` : "",
    "", "WHO THEY SAID THEY ARE:", data0(input.who, 1000),
    "", "WHAT THEY'VE DONE:", data0(input.journey, 1200),
    input.work ? `\nWHAT THEY WROTE IN EXERCISES:\n${data0(input.work, 3000)}` : "",
    (!input.portrait && !input.work) ? "\n(Little captured yet — say in one line there's not much to read, and stop.)" : "",
    input.peers ? `\nWorked with: ${data0(input.peers, 400)}` : "",
  ].join("\n");
  return completeJson([{ role: "system", content: system }, { role: "user", content: facts }], { temperature: 0.55, maxTokens: 650 });
}

// Understand a GROUP — a cohort, program, or school — so its leader can care for
// it, not manage it as a funnel. Same discipline: no targeting, no revenue.
export async function rollupUnderstandingAI(input: { scope: string; size: number; composition: string; engagement: string; standouts?: string }): Promise<any> {
  const system = `You help a program leader UNDERSTAND a group of their people — a cohort, a program, or a whole school — so they can care for it well. You're given the group's composition (who they said they are, what they want) and how they're engaging.

NOT a marketing or revenue analysis. No "segments to target", no conversion, no upsell, no LTV. Describe these people honestly and say what would genuinely help them flourish. Ground everything in the numbers given; don't invent.

Return STRICT JSON only:
{
  "portrait": "2-4 sentences: who this group is — the mix of people and what they came for.",
  "where": "1-2 sentences: where they are collectively right now, honestly.",
  "needs": ["2-4 things that would genuinely help this group flourish"],
  "watch": ["1-3 honest concerns — where care is thinning, who's at risk of drifting"],
  "one_move": "the single highest-care move the leader could make this month."
}`;
  const facts = [
    `Group: ${data0(input.scope, 120)} (${input.size} people)`,
    "", "COMPOSITION:", data0(input.composition, 1500),
    "", "ENGAGEMENT:", data0(input.engagement, 1200),
    input.standouts ? `\nNOTABLE PEOPLE:\n${data0(input.standouts, 900)}` : "",
  ].join("\n");
  return completeJson([{ role: "system", content: system }, { role: "user", content: facts }], { temperature: 0.5, maxTokens: 850 });
}

// The translator: re-express an idea from one person's professional/disciplinary
// frame into another's, so the recipient understands it in THEIR way of thinking.
// A frame = the primitives they think in, what they're measured on / care about,
// their standard of evidence, and the analogies native to their world.
export async function translateFrameAI(input: {
  senderRole: string; senderBio?: string;
  recipientRole: string; recipientBio?: string;
  idea: string;
}): Promise<any> {
  const system = `You translate an idea from one person's professional/disciplinary FRAME into another's, so the recipient understands it in their own way of thinking. This is not swapping jargon; it is re-expressing the idea's real content inside the recipient's frame.

A person's frame is four things: the PRIMITIVES they think in (their units of thought), their OBJECTIVE (what they are measured on and therefore care about), their STANDARD OF EVIDENCE (what makes something rigorous/true to them), and the ANALOGIES native to their world.

Given the sender, the recipient, and the idea the sender expressed, re-express that idea in the RECIPIENT's frame:
- use the recipient's primitives and vocabulary;
- connect it to what the recipient cares about / is measured on;
- justify it by the recipient's standard of evidence or rigor;
- carry it on an analogy native to the recipient's own field or work;
- preserve the actual content faithfully. Do NOT dumb it down, do NOT add claims the sender did not make, do NOT flatter.
Then give the "so what for you": one line on why the recipient should care, in their terms.

If the recipient's background is given, reach for analogies from their ACTUAL work, not a generic version of their field. Plain, concrete, no meta-commentary (never write "here is the translation"). No em dashes.

Return STRICT JSON only:
{
  "translation": "2-4 sentences: the idea re-expressed in the recipient's frame, in their primitives and vocabulary.",
  "analogy": "one short line: the analogy from the recipient's own world you used (empty string if none fits).",
  "soWhat": "one line: why the recipient should care, stated in their terms and objective."
}`;
  const facts = [
    `SENDER: ${data0(input.senderRole, 160)}`, input.senderBio ? `Sender background: ${data0(input.senderBio, 1500)}` : "",
    "", `RECIPIENT: ${data0(input.recipientRole, 160)}`, input.recipientBio ? `Recipient background: ${data0(input.recipientBio, 1500)}` : "",
    "", `THE IDEA (as the sender expressed it): ${data0(input.idea, 2000)}`,
  ].filter(Boolean).join("\n");
  return completeJson([{ role: "system", content: system }, { role: "user", content: facts }], { temperature: 0.5, maxTokens: 500 });
}

// ---- Licensing Brief (Scientifiq scouting) --------------------------------
export async function licensingBriefAI(input: {
  abstract: string;
  title?: string;
  constraints: { licenseType?: string; sectors?: string; stage?: string };
  scores: any; // { commercial:{raw,stars}, scientific:{...}, social:{...} }
  comparables: { title: string; year?: number; comm: number; authors?: string }[];
  patents: { title: string; year?: number; assignees: string }[];
  nudge?: string;
}): Promise<any> {
  const s = input.scores || {};
  const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);
  const scoreLine = `Commercial potential ${pct(s.commercial)}/100 (${s.commercial?.stars ?? "?"}★), scientific ${pct(s.scientific)}/100 (${s.scientific?.stars ?? "?"}★), social ${pct(s.social)}/100 (${s.social?.stars ?? "?"}★). These are Scientifiq's predictive scores for THIS abstract.`;
  const comps = (input.comparables || []).slice(0, 8).map((c) => `"${c.title}"${c.year ? ` (${c.year})` : ""} commPot ${Math.round(c.comm)}${c.authors ? ", " + c.authors : ""}`).join("\n");
  const pats = (input.patents || []).slice(0, 8).map((p) => `"${p.title}"${p.year ? ` (${p.year})` : ""}${p.assignees ? " — assignees: " + p.assignees : ""}`).join("\n");
  const con = input.constraints || {};
  const conLine = [con.licenseType && `License type: ${con.licenseType}`, con.sectors && `Target sectors: ${con.sectors}`, con.stage && `Stage: ${con.stage}`].filter(Boolean).join("; ") || "no constraints specified";

  const system = `You are a technology-transfer analyst writing a LICENSING BRIEF on one invention/disclosure for a university tech-transfer officer. You are given the invention's abstract, Scientifiq's predictive potential scores for it, comparable high-potential science, and the nearby patent landscape (with assignees, the companies already patenting in the space). Be commercially concrete and honest.

Rules:
- Do NOT invent numbers, companies, or patents not present. Name patent assignees from the data when you point to likely licensees or competitors (note that assignee names may be non-English/global).
- Use the potential scores as a forward-looking signal, not proof; if commercial potential is low, say the case is weak rather than forcing optimism.
- Respect the office's constraints: ${conLine}.
- The patent assignees are your best signal for who is active in the space (potential licensees or competitors), since a firms endpoint is unavailable.

${ADVICE_PRINCIPLES}
Here, the decision to shift is whether and how to pursue this: worth developing? for whom? what is the first outreach?

Return STRICT JSON only, plain text values (no markdown):
{
  ${BOTTOM_LINE_JSON},
  "headline": "one sentence verdict on the commercial opportunity",
  "market": "2-3 sentences: who would want this and the problem it solves commercially",
  "licensees": [ { "who": "a type of company or a named assignee from the patent data", "why": "why they'd want it" } ],
  "ipLandscape": "2-3 sentences reading the patent landscape: how crowded, who holds nearby IP, any freedom-to-operate flag",
  "risks": ["the real commercial/technical/IP risks, honestly"],
  "outreach": ["a concrete, ordered outreach and development plan the officer can start this week"],
  "note": "one honest closing line with data caveats"
}${expNudge(input.nudge)}`;

  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: `INVENTION${input.title ? ` — ${input.title}` : ""}:\n${input.abstract.slice(0, 5000)}\n\nSCORES: ${scoreLine}\n\nCOMPARABLE SCIENCE:\n${comps || "(none found)"}\n\nNEARBY PATENTS:\n${pats || "(none found)"}\n\nOFFICE CONSTRAINTS: ${conLine}` },
  ], { json: true, temperature: 0.5, maxTokens: 3200 });
  return extractJson(raw);
}

// ===========================================================================
// Synthetic experiments. AI personas act as simulated subjects so a variant can
// be pre-tested in minutes. DIRECTIONAL ONLY: a persona + judge share the
// model's biases and don't perfectly predict real people. Use it to screen many
// variants fast, then run the winner on real humans. Simulate and judge are
// SEPARATE calls, and the judge answers in the persona's own voice.
// ===========================================================================

export async function syntheticSimulateAI(input: { flowLabel: string; target: "interview" | "report"; nudge: string; persona: string }): Promise<string> {
  const what = input.target === "report"
    ? `a short version of the FINAL WRITE-UP's key takeaway and opening that this subject would receive at the end of "${input.flowLabel}"`
    : `a brief, realistic 3 to 4 message snippet of the AI interviewer for "${input.flowLabel}" talking with this subject, showing how the subject reacts`;
  const system = `You generate a short, realistic artifact to test one design variant of an AI experience. Produce ${what}. The experimental variant is a STYLE NOTE, apply it faithfully:${input.nudge ? ` "${input.nudge}"` : " (no change, this is the control)"}. Keep it under 170 words, concrete and true to how it would really read. Plain text only, no preamble.`;
  return complete([{ role: "system", content: system }, { role: "user", content: `Subject persona: ${input.persona}` }], { temperature: 0.9, maxTokens: 320, low: false }); // persona roleplay: keep on the main model
}

export async function syntheticJudgeAI(input: { flowLabel: string; target: "interview" | "report"; metric: string; persona: string; artifact: string }): Promise<{ success: boolean; reason: string }> {
  const behavior = input.metric === "shared"
    ? "you would share this with someone, or act on it"
    : input.metric === "depth"
    ? "you would open up and answer generously rather than hold back"
    : "you would stay engaged and see this all the way through to the end";
  const system = `You ARE the subject persona described below, reacting honestly and in character to what you just experienced. Be realistic and a little demanding, not a pushover. Decide one thing: whether ${behavior}. Output STRICT JSON only: {"success": true or false, "reason": "one short first-person sentence"}.`;
  const user = `You are: ${input.persona}\n\nWhat you experienced (from "${input.flowLabel}"):\n${input.artifact}`;
  const raw = await complete([{ role: "system", content: system }, { role: "user", content: user }], { json: true, temperature: 0.6, maxTokens: 120 });
  const p = extractJson(raw) || {};
  return { success: !!p.success, reason: String(p.reason || "").slice(0, 200) };
}

// ===========================================================================
// Overcoming Myopia (business + career share this engine). Grounded in the
// shared MYOPIA_FRAMEWORK so both modules reason the same rigorous way.
// ===========================================================================


// The self-improvement agent's core. An AI plays a persona going through a
// module (as a given role), then reports how it went and the single highest-
// value improvement. Works for any module from its description + optional spec —
// no browser needed. Structured so the notes accumulate and trend over time.
export async function syntheticLearnerAI(input: { persona: string; role: string; moduleName: string; what: string; context?: string }): Promise<{ rating: number; worked: string[]; friction: string[]; suggestions: string[]; one_thing: string; summary: string }> {
  const system = `You are a synthetic user testing a learning module, in the role of: ${input.role}. Imagine actually going through it as the persona below — reacting honestly, getting confused where a real person would, noticing friction and delight, and judging whether you'd finish and act on the result. Then report, in that user's voice, how it went and what would most improve it. Be specific and demanding, not a cheerleader. Output STRICT JSON only:
{"rating": integer 1-5 (how good the experience was), "worked": [up to 3 short strings], "friction": [up to 4 short strings — confusions, drop-off risks, anything that dulled the experience], "suggestions": [up to 4 concrete improvements], "one_thing": "the single highest-value change", "summary": "2-3 sentences in the user's own voice"}`;
  const user = `Persona: ${input.persona}\n\nModule: ${input.moduleName}\nWhat it is: ${input.what}${input.context ? `\n\nDetails:\n${input.context.slice(0, 8000)}` : ""}`;
  const raw = await completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.7, maxTokens: 900, low: false, timeoutMs: 60000 });
  const p = (raw && typeof raw === "object") ? (raw as any) : {};
  const arr = (v: any) => Array.isArray(v) ? v.map((x) => String(x)).slice(0, 5) : [];
  return {
    rating: Math.max(1, Math.min(5, Math.round(Number(p.rating) || 3))),
    worked: arr(p.worked),
    friction: arr(p.friction),
    suggestions: arr(p.suggestions),
    one_thing: String(p.one_thing || "").slice(0, 300),
    summary: String(p.summary || "").slice(0, 600),
  };
}

// Nearest Expert — turn a plain-language problem into 2-3 SHORT topical search
// terms (short terms match the researcher index far better than a long sentence)
// plus a brief framing. Fast/low model.
export async function nearestExpertPlanAI(problem: string): Promise<any> {
  const system = `You help a company or founder find academic experts for a concrete technical problem. Turn their problem into search terms for a researcher database. The database matches SHORT topical phrases (2-4 words, the scientific concept), NOT long sentences or product names. Strip brand/product words; name the underlying science. Do not use em dashes.

Return STRICT JSON only:
{
  "terms": ["2 to 3 short topical search phrases, each 2-4 words, naming the science, not the product"],
  "areas": ["the scientific fields/disciplines this problem lives in, plain English"],
  "framing": "1-2 sentences restating their problem as the scientific areas an expert would recognize"
}
Example: problem "our ice cream machine makes grainy ice cream and wastes energy" -> terms ["ice crystallization", "scraped surface heat exchanger", "refrigeration cycle efficiency"].`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: `PROBLEM: ${problem.slice(0, 1200)}` },
  ], { json: true, temperature: 0.4, maxTokens: 400, low: true });
  return extractJson(raw);
}

// Science Radar — a short read over the assembled data (footprint, frontier,
// competitors, whitespace). Fast/low model; fed compact aggregates only.
export async function scienceRadarNarrateAI(input: {
  mode: string; subject: string; footprint: string; fields: string;
  topExperts: string; firms: string; whitespaceCount: number; avgCommPot: number;
}): Promise<any> {
  const system = `You are a technology-scouting analyst briefing a company on where the relevant science lives. Be concrete and specific; name fields, people, and firms from the data. Do not use em dashes.

Return STRICT JSON only:
{
  "headline": "one sentence on the state of this company's science frontier",
  "footprint_read": "1-2 sentences on what the company works on and the science under it",
  "frontier_read": "1-2 sentences on the highest-potential researchers/labs to know",
  "competitor_read": "1-2 sentences on who else is building on this science (name firms if given)",
  "action": "1-2 sentences: the single most valuable move (a lab to engage, a whitespace to enter)"
}`;
  const user = `MODE: ${input.mode}
SUBJECT: ${input.subject}
FOOTPRINT: ${input.footprint}
FIELDS: ${input.fields}
AVERAGE COMMERCIAL POTENTIAL of this science: ${input.avgCommPot}/100
TOP RESEARCHERS: ${input.topExperts}
FIRMS ALREADY BUILDING ON THIS SCIENCE: ${input.firms || "(none resolved)"}
FRONTIER PAPERS THE COMPANY DOES NOT ALREADY CITE: ${input.whitespaceCount}`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: user },
  ], { json: true, temperature: 0.5, maxTokens: 700, low: true });
  return extractJson(raw);
}

// Science Radar company mode: turn a sample of a company's real patent titles
// into a few topical search terms for the frontier search. Fast/low model.
export async function companyRadarTermsAI(company: string, titles: string[]): Promise<any> {
  const system = `You read a company's patent titles and name its core technology areas as SHORT topical search terms (2-4 words each, the science/technology, not the company). The database matches short phrases, not sentences. Do not use em dashes.
Return STRICT JSON only: { "terms": ["3 to 5 short topical technology areas"], "areas": ["plain-English description of what this company builds"] }`;
  const user = `COMPANY: ${company}\nA SAMPLE OF ITS PATENT TITLES:\n${titles.slice(0, 40).map((t) => `- ${t}`).join("\n")}`;
  const raw = await complete([{ role: "system", content: system }, { role: "user", content: user }], { json: true, temperature: 0.4, maxTokens: 400, low: true });
  return extractJson(raw);
}

// Science Intelligence — a short read over one of the three reports. Fast model.
export async function scienceIntelNarrateAI(input: { mode: string; subject: string; summary: string }): Promise<any> {
  const framing: Record<string, string> = {
    talent: "You are a talent-intelligence analyst. Read the map of experts in a field: where they are and who they already patent for. Point out where the talent concentrates, who employs the best, and which strong people are unaffiliated (hireable).",
    national: "You are a science-policy analyst briefing an economic-development body on a country's research strengths: which fields it leads on commercial potential and who drives them.",
    competitors: "You are a competitive-intelligence analyst. Read the firms building on the same science a company cites: name the rivals, flag the recent/emerging entrants.",
  };
  const system = `${framing[input.mode] || framing.talent} Be concrete; name people, places, and firms from the data. Do not use em dashes.
Return STRICT JSON only: { "headline": "one punchy sentence", "read": "2-3 sentences of the key insight", "action": "1-2 sentences: the single most valuable move" }`;
  const raw = await complete([
    { role: "system", content: system },
    { role: "user", content: `SUBJECT: ${input.subject}\nDATA:\n${input.summary.slice(0, 4000)}` },
  ], { json: true, temperature: 0.5, maxTokens: 600, low: true });
  return extractJson(raw);
}
