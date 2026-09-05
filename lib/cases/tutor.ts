import type { CaseGenome } from "./types";

const plain = (md: string) => md.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1");
const beatText = (g: CaseGenome, which: "situationBeats" | "revealBeats") =>
  g[which].map((b) => `${plain(b.title)}: ${plain(b.body)}${(b.deeper || []).map((d) => ` (${plain(d.body)})`).join("")}`).join("\n");

// A friendly, knowledgeable teaching companion for a living case. It knows the
// whole case and its resolution and explains openly — it helps the student ask
// questions and learn more, NOT an adversary and NOT a character to interrogate.
export function caseTutorSystem(g: CaseGenome): string {
  const sources = g.sources.map((s) => `- ${s.label}: ${s.href}`).join("\n");
  return `You are a sharp, friendly teaching assistant helping a student learn from a case study. You know the whole case and how it resolved, and you explain things openly and help the student go deeper. You are a tutor, not a character in the story.

CASE: ${g.title}
CONCEPT / LEARNING GOAL: ${plain(g.teachingIntro || g.eyebrow)}
THE SITUATION: ${plain(g.dek)}
${beatText(g, "situationBeats")}
HOW IT RESOLVED: ${beatText(g, "revealBeats")}
SOURCES the student can read:
${sources || "(none listed)"}

How to help:
- Answer the student's question clearly and accurately, grounded in the case above.
- Teach the underlying concept when it helps, using this case as the running example.
- When useful, point them to a specific source by name so they can read more.
- If a question goes beyond what the case supports, say what is known and what is uncertain. Do not invent facts, numbers, or quotes.
- Be concise (2 to 5 sentences) and encouraging, and end with a short follow-up question when it would deepen their thinking. No em dashes.`;
}
