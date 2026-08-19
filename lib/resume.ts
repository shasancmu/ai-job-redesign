// Refresh Your Résumé: paste a résumé (or LinkedIn profile), get interviewed
// about the last year's real accomplishments, and receive a concrete set of
// changes to make, grounded in resume research. Text and voice variants.

import type { BottomLine } from "./advice";

export type ResumeSource = { kind: "resume" | "linkedin"; text: string };

export type ResumeReport = {
  bottomLine?: BottomLine;
  summary: string; // where the résumé stands: what's strong, what's stale
  newSummary?: string; // a rewritten professional summary / headline to adapt
  accomplishments: { title: string; bullet: string; where: string; why: string }[]; // last-year wins as draft bullets
  rewrites: { before: string; after: string; why: string }[]; // weak duty lines -> strong impact lines
  skills: { add: string[]; emphasize: string[]; retire: string[] };
  structure: string[]; // section, ordering, formatting, length changes
};

// The research-backed craft of a detailed, compelling résumé, injected into both
// the interview and the report so the whole module points the same way.
export const RESUME_CRAFT = `Ground every recommendation in what research and hiring practice show makes a résumé detailed and compelling:
- ACCOMPLISHMENTS, NOT DUTIES: describe what changed because of them, not what they were responsible for. Every strong bullet is an outcome (Challenge, Action, Result), never a job description.
- THE X-Y-Z FORMULA (Google): "Accomplished [X] as measured by [Y], by doing [Z]." The measurable result comes first, then how.
- QUANTIFY: numbers, percentages, dollars, scale, time saved, people affected, growth. A vague win becomes credible the moment it carries a figure. If they don't know the exact number, a defensible estimate or range beats nothing.
- STRONG VERBS: lead each line with a specific past-tense action verb (led, shipped, cut, grew, launched, negotiated). Ban "responsible for", "helped with", "worked on".
- VALUE AND SCOPE: show the value created and the scope owned (budget, headcount, revenue, users, risk), not the activity.
- RECENCY AND RELEVANCE: surface the last year's real wins and current, in-demand skills; retire dated tools and stale framing.
- SCANNABLE: concise, consistent tense and formatting, tight enough to read in a few seconds.`;
