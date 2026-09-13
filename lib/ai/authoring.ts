// AI domain functions — authoring. Split from the former monolithic lib/ai.ts; the
// shared engine + interview primitives live in lib/ai/core.ts.
import type { ChatMsg } from "@/lib/ai/core";
import { complete, completeJson, extractJson } from "@/lib/ai/core";


// Exported helpers for the mechanic engines (lib/mechanics) and the authoring
// Copilot — the AI boundary stays inside lib/ai.
export async function roleplayExaminerAI(system: string, user: string, maxTokens = 2400): Promise<any> {
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.4, maxTokens });
}

// Batch-translate UI/spec strings into `language`, preserving order and count.
// Structure is kept in code (the caller extracts + reinserts); the model only
// translates the strings, so a module spec can't be structurally corrupted.
export async function translateStringsAI(strings: string[], language: string): Promise<string[]> {
  if (!strings.length) return [];
  // Chunk so a big spec (a paper explainer has many long paragraphs, and the
  // translated text is often token-heavier) never blows the output budget and
  // fails the whole copy. Each chunk is independent and best-effort: on any error
  // it falls back to the originals for that chunk, so a copy is always produced.
  const CHUNK = 12;
  const slices: string[][] = [];
  for (let i = 0; i < strings.length; i += CHUNK) slices.push(strings.slice(i, i + CHUNK));
  // Translate the chunks CONCURRENTLY so a large spec (a paper explainer has ~50
  // strings) resolves in one call's latency, not N sequential calls — otherwise the
  // page render times out and the whole thing falls back to English. Each chunk is
  // best-effort: on any error it keeps the originals for that chunk.
  const results = await Promise.all(slices.map(async (slice) => {
    const system = `You are a professional localizer for a learning app. Translate each string in the input JSON array into ${language}, natural and idiomatic for a learner. Preserve meaning, tone, light markdown, and any {placeholders}, %s, numbers, or proper names. Do not add, drop, reorder, or merge items. Do not use em dashes. Return STRICT JSON only: {"t": [ ... ]} with EXACTLY ${slice.length} translated strings in the same order.`;
    let arr: any[] = [];
    try {
      const res = await completeJson([{ role: "system", content: system }, { role: "user", content: JSON.stringify(slice) }], { temperature: 0.2, maxTokens: 3000, low: false });
      arr = Array.isArray(res?.t) ? res.t : Array.isArray(res) ? res : [];
    } catch { arr = []; }
    return slice.map((s, j) => (typeof arr[j] === "string" && arr[j].trim() ? arr[j] : s));
  }));
  return results.flat();
}

// ---- AI Skills Lab (lib/ailab) ---------------------------------------------
// The three teaching simulators (prompting, agentic, vibe-coding) all reach the
// model through these. Kept here so the AI boundary and the per-org BYO provider
// routing stay in one place.

// Run the LEARNER'S prompt as a real completion and return the raw output — the
// authentic thing they're learning to steer. `messages` is their prompt as a
// system + user pair (or just a user turn).
export async function labRunPromptAI(system: string | null, user: string, maxTokens = 900): Promise<string> {
  const msgs: ChatMsg[] = [];
  if (system && system.trim()) msgs.push({ role: "system", content: system.slice(0, 8000) });
  msgs.push({ role: "user", content: user.slice(0, 8000) });
  return complete(msgs, { temperature: 0.7, maxTokens, low: true });
}

// The judge: score an attempt against a rubric and explain the gap. Deterministic
// temperature so the same attempt grades consistently. Returns strict JSON.
export async function labJudgeAI(system: string, user: string, maxTokens = 1400): Promise<any> {
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0, maxTokens });
}

// One step of an agent loop over MOCK tools: given the goal, the tools, and the
// trace so far, decide the next action (a tool call, a question, or finish).
export async function labAgentStepAI(system: string, user: string, maxTokens = 1200): Promise<any> {
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.3, maxTokens });
}

// Vibe-coding: turn a spec + prompt into a small self-contained HTML preview AND
// the hidden assumptions the model had to make — so the intent/instruction gap is
// visible. Returns { html, assumptions[], notes }.
export async function labVibeGenerateAI(system: string, user: string, maxTokens = 2600): Promise<any> {
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.5, maxTokens });
}

export async function moduleCopilotAI(system: string, user: string): Promise<any> {
  // A full module spec is a heavy generation; give it near the route's maxDuration
  // rather than the default 55s so it doesn't abort mid-build. 95s + a 20s capped
  // retry stays under the routes' 120s limit.
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.5, maxTokens: 6000, low: false, timeoutMs: 95000 });
}
// Streaming variant of moduleCopilotAI: forwards raw tokens to onToken as they
// arrive (so the UI can show live progress) and returns the parsed spec. Streamed
// generations skip the non-streamed JSON-repair retry, so if the streamed text
// doesn't parse we fall back to the non-streamed builder once.
export async function moduleCopilotStream(system: string, user: string, onToken: (delta: string) => void): Promise<any> {
  const messages: ChatMsg[] = [{ role: "system", content: system }, { role: "user", content: user }];
  // A full module spec runs well past 6k tokens — role-plays land around 4,000
  // words — and truncation there produced JSON that only sometimes survived
  // repair. Give it room, and time to use it.
  const text = await complete(messages, { json: true, temperature: 0.5, maxTokens: 16000, low: false, timeoutMs: 240000, onToken });
  const parsed = extractJson(text);
  if (parsed) return parsed;
  // Only start over if the stream produced almost nothing. Re-running a whole
  // generation after two minutes of streaming just guarantees the route dies
  // before either finishes; better to fail with something the author can act on.
  if (text.trim().length < 400) return moduleCopilotAI(system, user);
  throw new Error("The draft came back incomplete. Try again, or shorten the description.");
}
export async function moduleCriticAI(system: string, user: string): Promise<any> {
  // Reviews a full spec (up to 30k chars); the default 55s was too tight and, with
  // the repair retry, could exceed the route limit and return a 504. 85s + a capped
  // retry fits under the critic route's 120s.
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.2, maxTokens: 2500, low: false, timeoutMs: 85000 });
}
// Simulate a full run for the playtest: the model plays out a realistic learner
// x character transcript plus the learner's verdict. Higher temperature for
// believable variation between the strong and weak personas.
// Streaming Q&A for an instructor chatting with their cohort's data. The system
// prompt carries the cohort digest; this just streams grounded answers.
export async function cohortChatReply(system: string, history: ChatMsg[], onToken: (t: string) => void): Promise<string> {
  const convo: ChatMsg[] = history.length ? history.slice(-16) : [{ role: "user", content: "(Begin.)" }];
  return complete([{ role: "system", content: system }, ...convo], { temperature: 0.4, maxTokens: 900, onToken, low: true });
}
// Streaming interviewer for the module-authoring flow: given the running
// conversation, streams the next short question (works for both text and voice).
export async function authoringInterviewReply(system: string, history: ChatMsg[], onToken: (t: string) => void): Promise<string> {
  // The opening turn has no history yet; the Anthropic API requires at least one
  // non-system message, so seed a synthetic "begin" turn (as empathy/portrait do).
  const convo: ChatMsg[] = history.length ? history.slice(-24) : [{ role: "user", content: "(Begin the interview now with your opening question.)" }];
  return complete([{ role: "system", content: system }, ...convo], { temperature: 0.7, maxTokens: 400, onToken });
}
// One-sentence, specific debrief for a quiz result: fast model, plain text.
// A minimal call to verify a provider is reachable and answering (used by the
// org "test connection" button, under a temporarily-installed org provider).
export async function aiHealthCheck(): Promise<string> {
  return complete([{ role: "system", content: "Reply with exactly: OK" }, { role: "user", content: "ping" }], { maxTokens: 8, low: false, temperature: 0, timeoutMs: 15000, flow: "org-ai:test" });
}

export async function benchmarkNoteAI(system: string, user: string): Promise<string> {
  const text = await complete(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { temperature: 0.6, maxTokens: 120, low: true, timeoutMs: 30000, flow: "mechanics:benchmark-note" },
  );
  return String(text || "").replace(/\s+/g, " ").trim();
}

// Turn an old report headline into a name.
//
// The headline prompts used to ask for "one honest sentence" and got thirty-word
// theses, which rendered as the report's h1 with the summary saying the same
// thing underneath. New runs ask for a name; this is for what is already stored.
export async function reportNameAI(sentence: string): Promise<string> {
  const text = await complete(
    [
      {
        role: "system",
        content: `Turn a sentence about someone's role into a NAME for it.

Rules: 3 to 6 words. Shaped like a job title, the way "Floor Leader, Amplified by Data" names a role. No verb phrase, no full sentence, no trailing punctuation, no quotes. Use the sentence's own vocabulary. Reply with the name and nothing else.`,
      },
      { role: "user", content: sentence.slice(0, 600) },
    ],
    { temperature: 0.3, maxTokens: 40, low: true, timeoutMs: 30000, flow: "admin:report-name" },
  );
  return String(text || "").replace(/\s+/g, " ").trim();
}

// The memory-prosthetic draft: help a teacher write a SHORT, genuine check-in to
// one student they know — grounded in what that person last worked on. It is
// never sent automatically; the human edits it and sends it in their own voice.
// So the draft is deliberately plain and ask-free: no offer, no link, no CTA —
// a teacher reaching out because they noticed, not a funnel step.
export async function draftReachOutAI(input: {
  learnerName: string; senderName?: string; orgName: string; voice?: string;
  lastModule?: string | null; quietDays?: number | null;
}): Promise<string> {
  const first = (input.learnerName || "there").trim().split(/\s+/)[0];
  const senderFirst = input.senderName ? input.senderName.trim().split(/\s+/)[0] : "";
  const system = [
    "You help a teacher write a short, genuine check-in note to ONE of their students — a real person they know.",
    "This is NOT marketing. There is NO ask, NO offer, NO call-to-action, NO link, NO event. It is a teacher reaching out because they noticed someone had gone a little quiet and they care.",
    "Constraints: 40–80 words. Warm but not gushing; specific, not generic; plain and human. If given what they last worked on, refer to it naturally. At most one light, open question. No emojis. No subject line. No preamble like 'Here is a note'. Output only the note body.",
    senderFirst ? `Sign off simply as "${senderFirst}".` : "Do not invent a sign-off name.",
    input.voice ? `The institution's voice is: ${input.voice}. Let it lightly tint the tone; the teacher's own plain voice comes first.` : "",
  ].filter(Boolean).join("\n");
  const user = [
    `Student's first name: ${first}`,
    input.lastModule ? `They last worked on: ${input.lastModule}` : "You don't know exactly what they last did — keep it about them, not a specific module.",
    input.quietDays != null ? `They've been quiet for about ${input.quietDays} days.` : "",
    `Institution: ${input.orgName}`,
  ].filter(Boolean).join("\n");
  const text = await complete(
    [{ role: "system", content: system }, { role: "user", content: user }],
    { temperature: 0.7, maxTokens: 220, low: true, timeoutMs: 30000, flow: "relationship:reach-out-draft" },
  );
  return String(text || "").trim();
}
export async function simulateRunAI(system: string, user: string): Promise<any> {
  // The playtest runs this then the examiner in one request; bound it so the pair
  // stays under the route's 120s.
  return completeJson([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.75, maxTokens: 1800, low: false, timeoutMs: 45000 });
}
// Cheap-model compression of uploaded source material into a grounding briefing.
// The raw text is never persisted; only this summary is kept, and it feeds the
// Copilot as source. Uses the FAST model (low: true).
export async function summarizeSourceAI(text: string): Promise<string> {
  const system = "You compress source material into a tight briefing that an instructional designer will use to ground a role-play learning module. Capture: the situation and context, the concrete facts and numbers, the people or roles involved, the central tension or decision, and anything that could become a hidden truth or a line of questioning. Be faithful and specific; never invent facts that aren't in the source. 250 to 400 words, plain prose, no preamble, no headings. No em dashes.";
  const out = await complete([{ role: "system", content: system }, { role: "user", content: text.slice(0, 14000) }], { low: true, maxTokens: 900 });
  return String(out || "").trim();
}
