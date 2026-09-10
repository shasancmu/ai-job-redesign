// Cheap, deterministic conversation dynamics. Given the turns of one
// conversation, compute a compact signal of how it went — depth, who carried it,
// whether the human opened up over time. No AI, no I/O: pure over the turns, so
// it can run inline in the logging seam and be recomputed for free. This is the
// leading indicator the experiment engine reads to see whether an intervention
// is moving a conversation "forward" before the final outcome is even known.

import type { Turn } from "@/lib/conversationLog";

export type Dynamics = {
  turns: number;         // total turns captured
  humanTurns: number;
  aiTurns: number;
  humanWords: number;
  aiWords: number;
  humanAvgWords: number; // elaboration per human turn
  aiAvgWords: number;
  questionRate: number;  // 0-1: share of human turns that ask something (curiosity/probing)
  drive: number;         // 0-1: human share of total words (who is carrying the conversation)
  movement: number;      // -1..1: did the human elaborate MORE in the back half than the front?
  depth: number;         // 0-100 composite: breadth of engagement x elaboration x probing
  voice: boolean;        // any turn arrived as voice transcript
};

function words(s: string): number {
  const t = (s || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

export function computeDynamics(turns: Turn[]): Dynamics {
  const list = Array.isArray(turns) ? turns.filter((t) => t && typeof t.text === "string") : [];
  const human = list.filter((t) => t.speaker === "human");
  const ai = list.filter((t) => t.speaker === "ai");

  const humanWords = human.reduce((n, t) => n + words(t.text), 0);
  const aiWords = ai.reduce((n, t) => n + words(t.text), 0);
  const humanAvgWords = human.length ? humanWords / human.length : 0;
  const aiAvgWords = ai.length ? aiWords / ai.length : 0;
  const questionRate = human.length ? human.filter((t) => t.text.includes("?")).length / human.length : 0;
  const drive = humanWords + aiWords > 0 ? humanWords / (humanWords + aiWords) : 0;

  // Movement: compare the human's elaboration in the front half vs the back half
  // of their turns. Positive means they warmed up and said more as it went.
  let movement = 0;
  if (human.length >= 2) {
    const mid = Math.floor(human.length / 2);
    const front = human.slice(0, mid);
    const back = human.slice(mid);
    const fa = front.length ? front.reduce((n, t) => n + words(t.text), 0) / front.length : 0;
    const ba = back.length ? back.reduce((n, t) => n + words(t.text), 0) / back.length : 0;
    movement = Math.max(-1, Math.min(1, (ba - fa) / (fa + 8)));
  }

  // Depth (0-100): a blend of how many exchanges the human sustained (capped at
  // 10), how much they elaborated per turn (capped at 40 words), and how much
  // they probed. Tuned so a rich back-and-forth lands in the 60-90 band.
  const volume = Math.min(human.length, 10) / 10;
  const elaboration = Math.min(humanAvgWords, 40) / 40;
  const depth = Math.round(100 * (0.4 * volume + 0.4 * elaboration + 0.2 * questionRate));

  return {
    turns: list.length,
    humanTurns: human.length,
    aiTurns: ai.length,
    humanWords,
    aiWords,
    humanAvgWords: Math.round(humanAvgWords * 10) / 10,
    aiAvgWords: Math.round(aiAvgWords * 10) / 10,
    questionRate: Math.round(questionRate * 100) / 100,
    drive: Math.round(drive * 100) / 100,
    movement: Math.round(movement * 100) / 100,
    depth,
    voice: list.some((t) => t.modality === "voice"),
  };
}
