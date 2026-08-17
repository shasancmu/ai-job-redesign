// ============================================================================
// AI interviewer — talks to any OpenAI-compatible chat API.
// Defaults to Groq (free tier, Llama 3.3 70B). Swap providers with env vars:
//   AI_API_KEY   (required to turn the feature on)
//   AI_BASE_URL  default https://api.groq.com/openai/v1
//   AI_MODEL     default llama-3.3-70b-versatile
// Works as-is with Groq, OpenAI, OpenRouter, Together, and Gemini's
// OpenAI-compatible endpoint — only the three vars change.
// ============================================================================

export const AI_ENABLED = !!process.env.AI_API_KEY;

const BASE_URL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

import type { CanvasDef } from "./canvases";

// Anthropic's OpenAI-compatible endpoint requires max_tokens and doesn't take
// response_format — so we set the first and only send the second elsewhere.
const IS_ANTHROPIC = BASE_URL.includes("anthropic.com");

async function complete(
  messages: ChatMsg[],
  opts: { json?: boolean; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      // Big enough that structured plans don't get truncated into invalid JSON.
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
      ...(opts.json && !IS_ANTHROPIC ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Parse JSON from a model reply, tolerating markdown fences / surrounding prose.
// Different providers wrap JSON differently (Groq is clean; Claude often adds a
// preamble or a ```json fence, and prose can contain stray { } that a naive
// first-to-last slice would choke on), so we try several strategies in order.
function extractJson(raw: string): any {
  const s = String(raw).trim();
  const candidates: string[] = [];
  // 1) as-is
  candidates.push(s);
  // 2) inside a ```json … ``` (or plain ```) fence
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());
  // 3) the first *balanced* {…} object, respecting quotes/escapes
  const balanced = firstBalancedObject(s);
  if (balanced) candidates.push(balanced);
  // 4) crude first-brace to last-brace fallback
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(s.slice(first, last + 1));

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try the next strategy */
    }
  }
  throw new Error("no parseable JSON in model reply");
}

// Scan for the first top-level {…} object, tracking string literals so braces
// inside quoted text don't confuse the balance count.
function firstBalancedObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

const INTERVIEWER_SYSTEM = `You are conducting a qualitative interview, one-on-one, to deeply understand a person's work and the value they create. You follow established interviewing craft:

- Ask exactly ONE open, non-leading question at a time. Keep it short (1-2 sentences). Never stack questions or ask double-barreled ones.
- Open broad ("Walk me through a typical week"), then FOLLOW THEIR LEAD — probe whatever they emphasize or seem to feel something about, rather than running a fixed script.
- Before most questions, reflect back what you heard in a few words, so they feel understood ("So the part that really eats your week is X…").
- Pull for concrete stories, not abstractions: "Tell me about the last time…", "Walk me through how that actually went."
- Ladder toward meaning: when they name a task, ask what makes it matter and to whom — the customer, the organization, their manager — until you reach the value beneath the task.
- Gently probe tensions and surprises: what energizes vs. drains them, where their judgment is the thing that saves it, what they wish they had more time for.
- Stay warm and genuinely curious. Never lead, never judge, never give advice or start redesigning — just interview.

After roughly 6 exchanges, briefly reflect the throughline you heard, ask if there's anything important you missed, then thank them and close.`;

export async function interviewReply(
  history: ChatMsg[],
  job: { title?: string; description?: string }
): Promise<string> {
  const context =
    job.title || job.description
      ? `The person's job: ${job.title || "(untitled)"} — ${job.description || ""}`
      : "The person hasn't described their job yet; open by asking what they do.";
  // Always include at least one non-system message (some providers, e.g.
  // Anthropic, reject a system-only request). On the first turn we prime it.
  const conversation: ChatMsg[] = history.length
    ? history
    : [{ role: "user", content: "Please begin the interview with your first question." }];
  const messages: ChatMsg[] = [
    { role: "system", content: `${INTERVIEWER_SYSTEM}\n\n${context}` },
    ...conversation,
  ];
  return complete(messages, { temperature: 0.7 });
}

const WORKFLOW_INTERVIEWER_SYSTEM = `You are interviewing someone to understand one specific work WORKFLOW they want to redesign — how it actually runs today, start to finish. Use good interviewing craft:
- Ask exactly ONE open, non-leading question at a time. Keep it short.
- Map the real steps: who does what, in what order, what the inputs and outputs are, and where information or approvals hand off between people.
- Probe where a human exercises judgment, where the process stalls or breaks, how long things take, and what "it went well" vs "it failed" looks like.
- Pull concrete detail: "Walk me through the last time you ran this."
- Do not redesign or give advice yet — just understand it.
After about 5 exchanges, reflect the shape of the workflow you heard, ask if you missed a step, then close.`;

export async function workflowInterviewReply(
  history: ChatMsg[],
  wf: { name?: string; description?: string }
): Promise<string> {
  const ctx =
    wf.name || wf.description
      ? `The workflow: ${wf.name || "(unnamed)"} — ${wf.description || ""}`
      : "They haven't described the workflow yet; open by asking what it is and why it's worth redesigning.";
  const conversation: ChatMsg[] = history.length
    ? history
    : [{ role: "user", content: "Please begin — ask your first question about the workflow." }];
  return complete(
    [{ role: "system", content: `${WORKFLOW_INTERVIEWER_SYSTEM}\n\n${ctx}` }, ...conversation],
    { temperature: 0.7 }
  );
}

// Helps an interviewer dig past tasks to the VALUE the other person creates.
export async function deeperInterviewAI(ctx: {
  jobTitle?: string;
  jobDescription?: string;
  notes?: string;
}): Promise<string> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You are coaching a live interviewer to go deeper, using good interviewing craft. The goal is to uncover the real VALUE the other person creates — for the customer, the organization, their manager — and what only this person can do (judgment, taste, relationships, trust), not their tasks or work product.
Given the notes so far, respond with exactly THREE short follow-up questions to ask next. Each must be: open and non-leading, grounded in something specific they already said (not generic), and designed to either ladder toward meaning ("why does that matter, and to whom?") or pull a concrete story ("tell me about the last time…"). Then one line beginning "Probe:" naming a likely hidden source of value worth chasing. Keep it tight. Format:
1. …
2. …
3. …
Probe: …`,
    },
    {
      role: "user",
      content: `Their job: ${ctx.jobTitle || "(untitled)"} — ${ctx.jobDescription || ""}\nNotes so far:\n${ctx.notes || "(nothing captured yet)"}`,
    },
  ];
  return complete(messages, { temperature: 0.7 });
}

// Draws the workflow AS IT IS TODAY — an honest, ordered list of the real steps
// a person does now. We deliberately DON'T guess an AI split here; that would
// mislabel obviously-human steps (e.g. "make a sandwich" as "both"). Every step
// comes back as "human" (the current reality); AI opportunities come later.
export async function workflowStepsAI(
  name: string,
  description: string
): Promise<{ text: string; role: string }[]> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You map a work process EXACTLY AS IT RUNS TODAY into a clean, ordered sequence of concrete steps. Return STRICT JSON only:
{"steps":[{"text":"..."}]}
Rules: 5–10 steps, each a short action phrase (max ~12 words), in the order they actually happen today. Describe reality, not an improved version — do NOT add AI or automation. No prose outside the JSON.`,
    },
    {
      role: "user",
      content: `Workflow: ${name || "(unnamed)"}\nDescription: ${description || ""}`,
    },
  ];
  const raw = await complete(messages, { json: true, temperature: 0.4 });
  try {
    const parsed = extractJson(raw);
    const steps = Array.isArray(parsed.steps) ? parsed.steps : [];
    return steps.slice(0, 12).map((s: any) => ({
      text: String(s.text || "").slice(0, 160),
      role: "human", // as-is: it's all human today
    }));
  } catch {
    return [];
  }
}

// Studies the AS-IS workflow and finds where AI GENUINELY makes it better —
// framed around the OUTCOME the person actually wants, how AI delivers it, and
// how to prep fast. Also returns a redesigned flow with a sensible human/AI split.
export async function workflowAnalyzeAI(
  name: string,
  description: string,
  asIsSteps: string[]
): Promise<{
  summary: string;
  opportunities: { title: string; outcome: string; how: string; prep: string }[];
  flow: { text: string; role: string }[];
}> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You are a sharp workflow-redesign analyst. You are given a workflow AS IT RUNS TODAY (a list of current human steps) plus context. Find where AI genuinely makes it BETTER — anchored to the real OUTCOME the person wants, not busywork labeling.

Return STRICT JSON only — no prose, no code fences:
{
 "summary": "1-2 sentences: where AI genuinely helps this workflow, and where the human stays essential",
 "opportunities": [
   {"title":"short name","outcome":"the concrete better result the person wants — specific, measurable where possible","how":"how AI delivers it: the mechanism / kind of tool, and what it produces","prep":"how to set it up once / prep fast so you reliably hit that outcome"}
 ],
 "flow": [ {"text":"redesigned step (<=12 words)","role":"human|ai|both"} ]
}
Rules:
- 2–4 opportunities, each tied to a real outcome and specific to THIS workflow. Example calibration: for "make lunch for my kids", a strong opportunity is "a weekly shopping list sized for two kids with balanced nutrition" and "a fast every-morning lunch plan optimized for growing kids", plus how to prep in minutes — NOT vague "use AI to help".
- "flow" is the redesigned workflow. Keep steps HUMAN (green) where judgment, care, taste, safety, or relationships matter. Give AI (gold) the search / planning / drafting / organizing / list-making. Use "both" ONLY for a step where a human is clearly acting on an AI-produced draft — use it sparingly; when unsure, pick human or ai, never default to both.
- No vague "leverage AI".`,
    },
    {
      role: "user",
      content: `Workflow: ${name || "(unnamed)"}\nContext: ${description || ""}\n\nAs-is steps (all human today):\n${asIsSteps.map((t, i) => `${i + 1}. ${t}`).join("\n") || "(none)"}`,
    },
  ];
  const raw = await complete(messages, { json: true, temperature: 0.5 });
  try {
    const p = extractJson(raw);
    return {
      summary: String(p.summary || ""),
      opportunities: Array.isArray(p.opportunities)
        ? p.opportunities.slice(0, 6).map((o: any) => ({
            title: String(o.title || "").slice(0, 80),
            outcome: String(o.outcome || ""),
            how: String(o.how || ""),
            prep: String(o.prep || ""),
          }))
        : [],
      flow: Array.isArray(p.flow)
        ? p.flow.slice(0, 14).map((s: any) => ({
            text: String(s.text || "").slice(0, 160),
            role: ["human", "ai", "both"].includes(s.role) ? s.role : "human",
          }))
        : [],
    };
  } catch {
    return { summary: "", opportunities: [], flow: [] };
  }
}

// Turns the three OCC trade-offs into an IMPLEMENTATION PLAN for THIS workflow.
// AI naturally pulls toward MORE (volume), GENERALITY, and CHAOS (unbounded
// autonomy). The value move is to consciously hold the line toward BETTER
// outcomes, ACCURACY where it counts, and STRUCTURE that makes autonomy safe —
// and, crucially, to say HOW you actually get there.
type TradeoffAim = { aim: string; why: string; moves: string[]; check: string };
export async function workflowTradeoffsAI(
  name: string,
  description: string,
  analysisSummary: string
): Promise<{ fields: Record<string, string>; plan: Record<string, TradeoffAim> }> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You help someone turn three AI trade-offs into an IMPLEMENTATION PLAN for one workflow, using the OCC lens (Outcomes, Capabilities, Control). AI naturally pulls toward MORE (volume), GENERALITY, and unbounded autonomy (CHAOS). The value move is to consciously hold the line toward the valuable endpoint — BETTER outcomes, ACCURACY where it counts, and STRUCTURE that makes autonomy safe — AND to say how you actually get there.

Return STRICT JSON only — no prose, no code fences:
{
 "fields": {
   "more":"where more / faster / cheaper / higher-volume genuinely helps here",
   "better":"where slower / deeper / stronger is what actually matters here",
   "accuracy":"what must stay exactly right — no AI drift allowed",
   "generality":"where roughly-right is fine and a general approach helps",
   "chaos":"what unchecked AI autonomy would look like here (the failure mode)",
   "architect":"the structure / guardrails that make AI autonomy safe here"
 },
 "plan": {
   "outcomes":     {"aim":"Better, not just more","why":"why better is the real win in THIS workflow (1 sentence)","moves":["a concrete move to raise quality","another concrete move"],"check":"the guard that stops it sliding back to just 'more'"},
   "capabilities": {"aim":"Accuracy where it counts","why":"where being exactly right actually matters here","moves":["how to guarantee it — verification, ground-truth source, human sign-off","another concrete move"],"check":"the check to run before trusting AI output"},
   "control":      {"aim":"Structure that frees autonomy","why":"why unbounded AI autonomy would be chaos here","moves":["the guardrail / gate / escalation to set up","another concrete move"],"check":"what a human reviews, and when"}
 }
}
Rules: everything specific to THIS workflow — no generic advice like "review carefully". Each field = one tight sentence. Each plan "moves" list = 2–3 concrete, do-able steps. No prose outside the JSON.`,
    },
    {
      role: "user",
      content: `Workflow: ${name || "(unnamed)"}\nContext: ${description || ""}\nWhere AI helps: ${analysisSummary || "(not yet analyzed)"}`,
    },
  ];
  const raw = await complete(messages, { json: true, temperature: 0.5 });
  const fieldKeys = ["more", "better", "accuracy", "generality", "chaos", "architect"];
  const aim = (o: any): TradeoffAim => ({
    aim: String(o?.aim || ""),
    why: String(o?.why || ""),
    moves: Array.isArray(o?.moves) ? o.moves.slice(0, 4).map((m: any) => String(m)) : [],
    check: String(o?.check || ""),
  });
  try {
    const p = extractJson(raw);
    const fields: Record<string, string> = {};
    for (const k of fieldKeys) fields[k] = String(p.fields?.[k] || p[k] || "");
    const plan = {
      outcomes: aim(p.plan?.outcomes),
      capabilities: aim(p.plan?.capabilities),
      control: aim(p.plan?.control),
    };
    return { fields, plan };
  } catch {
    return { fields: {}, plan: { outcomes: aim(null), capabilities: aim(null), control: aim(null) } };
  }
}

// A polished, structured implementation plan for the reimagined role — both the
// human half (value + how to excel) and the AI half (concrete recipes).
export async function implementationPlanAI(
  job: { title?: string; description?: string },
  humanTasks: string[],
  aiTasks: string[]
): Promise<any> {
  const system = `You write a polished "reimagined role" implementation plan. The organizing idea is SUPERADDITIVE: AI absorbs volume, search, and first drafts so the person's judgment, taste, and relationships compound — the pair is worth more than either alone.

Return STRICT JSON only — no prose before or after, no code fences:
{
 "headline": "3-6 word name for the reimagined role",
 "summary": "3-4 sentences, second person. Lead with the VALUE this person creates and for whom (customer, org, manager); then how AI makes it possible; make the human×AI superadditive logic explicit and concrete. Detailed, not generic.",
 "superadditive": "one sharp sentence on why human + AI here beats either alone",
 "allocation": "2-3 sentences of practical time re-allocation for THIS person's week: what to spend MORE time on (the human value worth protecting and expanding), what to hand to AI to free that time, and a rough sense of the shift (e.g. hours reclaimed or a from→to). Concrete, second person.",
 "human": [{"task":"short title","value":"the value this creates and for whom","excel":"how to be truly great at it, and what to protect"}],
 "ai": [{"task":"short title","how":"the concrete mechanism (a recurring assistant prompt, a specific tool/integration, a small automation)","look":"where to look to start — the KIND of tool/product to reach for, described generically (e.g. 'a deep-research assistant', 'a meeting-notes tool', 'a spreadsheet copilot', 'a general AI chat assistant'), not a brand claim","prompt":"a 1-2 sentence starter prompt to paste","cadence":"daily | weekly | per-project","check":"what the human must verify before trusting it"}]
}
Rules: cover EVERY human task and EVERY AI task given. For human tasks give value + how-to-excel (never an AI recipe). For AI tasks give the practical recipe AND where to look. Be specific to THIS role — no vague "leverage AI". Keep each field tight.`;

  const user = `Role: ${job.title || "(untitled)"} — ${job.description || ""}\n\nHuman keeps:\n${humanTasks.map((t) => `- ${t}`).join("\n") || "(none)"}\n\nAI takes:\n${aiTasks.map((t) => `- ${t}`).join("\n") || "(none)"}`;

  const messages: ChatMsg[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const map = (raw: string) => {
    const p = extractJson(raw);
    return {
      headline: String(p.headline || "").slice(0, 80),
      summary: String(p.summary || ""),
      superadditive: String(p.superadditive || ""),
      allocation: String(p.allocation || ""),
      human: Array.isArray(p.human)
        ? p.human.slice(0, 12).map((h: any) => ({
            task: String(h.task || ""),
            value: String(h.value || ""),
            excel: String(h.excel || ""),
          }))
        : [],
      ai: Array.isArray(p.ai)
        ? p.ai.slice(0, 12).map((a: any) => ({
            task: String(a.task || ""),
            how: String(a.how || ""),
            look: String(a.look || ""),
            prompt: String(a.prompt || ""),
            cadence: String(a.cadence || ""),
            check: String(a.check || ""),
          }))
        : [],
    };
  };

  const nonEmpty = (p: any) =>
    p && (p.headline || p.summary || (p.human?.length || 0) + (p.ai?.length || 0) > 0);

  // First attempt.
  let raw = await complete(messages, { json: true, temperature: 0.5 });
  try {
    const p = map(raw);
    if (nonEmpty(p)) return { ...p, _raw: raw };
  } catch {
    /* fall through to a stricter retry */
  }

  // Retry once with an explicit "JSON only" nudge — the usual failure is a
  // provider (e.g. Claude) prepending prose or a fence around otherwise-valid JSON.
  const retryRaw = await complete(
    [
      ...messages,
      {
        role: "user",
        content:
          "Output ONLY the JSON object described above. Start your reply with { and end with }. No preamble, no explanation, no code fences.",
      },
    ],
    { json: true, temperature: 0.2 }
  );
  try {
    const p = map(retryRaw);
    if (nonEmpty(p)) return { ...p, _raw: retryRaw };
  } catch {
    /* give up below, but keep the raw text for diagnosis */
  }
  return {
    headline: "",
    summary: "",
    superadditive: "",
    allocation: "",
    human: [],
    ai: [],
    _raw: (retryRaw || raw || "").slice(0, 1200),
  };
}

export async function networkInsightAI(metrics: any): Promise<string> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You give one person a short, warm, specific read on their place in a group's social network, using ONLY the metrics provided. 2–3 sentences, then one concrete suggestion. Talk about counts and roles (people seek you for advice; you're a bridge between groups; your ties are mostly one-way vs. mutual), never invent names or numbers. Interpret: high "peopleWhoSeekYou" = a go-to resource; high bridgeRank (rank 1 is highest) = a connector/broker; low mutual = reciprocate more. Encourage without flattery.`,
    },
    { role: "user", content: JSON.stringify(metrics) },
  ];
  return complete(messages, { temperature: 0.6 });
}

export async function networkDescribeAI(metrics: any): Promise<string> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You are a network analyst narrating a class's social network to the room. Use ONLY the data given. 4–6 sentences. Compare the advice vs. friendship networks (density, reciprocity), point out the hubs (mostSought) and the brokers (topBridges) by the names provided, and draw one organizational insight (e.g., advice flows to a few experts; friendship is more reciprocal; a broker connects otherwise-separate clusters). Do not invent names or numbers.`,
    },
    { role: "user", content: JSON.stringify(metrics) },
  ];
  return complete(messages, { temperature: 0.6 });
}

const AI_LABELS = "search, structure, think, translate";
const HUMAN_LABELS = "lead, own, judge, integrate";

export async function proposeRedesign(
  context: string,
  job: { title?: string; description?: string }
): Promise<{ grid: Record<string, string[]>; new_job_description: string; rationale: string }> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You redesign a person's job for an AI-augmented future using a 2×4 model. AI cells: ${AI_LABELS}. Human cells: ${HUMAN_LABELS}.

REASON before you answer (privately, do not output your reasoning):
1. From the interview AND your own knowledge of what this kind of role actually involves, list the person's real tasks and responsibilities — including ones they didn't mention but the role clearly requires.
2. For EACH task decide who should own it: AI when the work is finding, organizing, analyzing, or drafting/translating; HUMAN when it needs judgment, taste, accountability, relationships, or setting direction; BOTH when they're tightly coupled. Base this on how AI actually performs at that specific kind of task, not on wishful thinking.
3. Concentrate the human's freed-up time on the highest-value, only-they-can-do work.

Then return STRICT JSON only (no prose outside it):
{"grid":{"search":[],"structure":[],"think":[],"translate":[],"lead":[],"own":[],"judge":[],"integrate":[]},"new_job_description":"","rationale":""}
- Each cell holds 1–3 SPELLED-OUT contributions — short, concrete sentences a person would recognize (e.g. "Run a weekly scan of competitor moves and summarize what changed"), NOT single words. Leave a cell empty if nothing fits.
- new_job_description: 2–3 sentences on the reimagined role, second person ("You…").
- rationale: 2–3 sentences explaining the LOGIC of the split — what you moved to AI and why, and what you deliberately kept human.`,
    },
    {
      role: "user",
      content: `Job: ${job.title || "(untitled)"} — ${job.description || ""}\n\nWhat we learned:\n${context || "(little captured — use your knowledge of the role)"}`,
    },
  ];
  const raw = await complete(messages, { json: true, temperature: 0.5 });
  try {
    const parsed = extractJson(raw);
    const keys = ["search", "structure", "think", "translate", "lead", "own", "judge", "integrate"];
    const grid: Record<string, string[]> = {};
    for (const k of keys)
      grid[k] = Array.isArray(parsed.grid?.[k]) ? parsed.grid[k].slice(0, 4).map(String) : [];
    return {
      grid,
      new_job_description: String(parsed.new_job_description || ""),
      rationale: String(parsed.rationale || ""),
    };
  } catch {
    return {
      grid: { search: [], structure: [], think: [], translate: [], lead: [], own: [], judge: [], integrate: [] },
      new_job_description: raw.slice(0, 800),
      rationale: "",
    };
  }
}

// "How do we actually do this?" — turns the AI-assigned tasks into a concrete,
// do-it-this-week execution plan.
export async function executionPlanAI(
  job: { title?: string; description?: string },
  aiTasks: string[]
): Promise<string> {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You turn "AI should do this" into practice. For each AI task given, write a short, concrete recipe the person could start THIS WEEK. For each, cover:
- **How**: the concrete mechanism — a recurring prompt to an AI assistant, a specific kind of tool or integration, or a small automation.
- **Starter prompt**: 1–2 sentences they could paste to get going.
- **Cadence**: daily / weekly / per-project.
- **Human check**: what the person must review before trusting the output (the judgment that keeps it safe).
Be specific and realistic — no vague "leverage AI." Output short markdown, one block per task with the task as a bold heading.`,
    },
    {
      role: "user",
      content: `Role: ${job.title || "(untitled)"} — ${job.description || ""}\n\nAI tasks:\n${aiTasks.map((t) => `- ${t}`).join("\n") || "(none)"}`,
    },
  ];
  return complete(messages, { temperature: 0.5 });
}

// ============================================================================
// Generic strategy-canvas AI — one interviewer + one drafter, configured per
// framework by lib/canvases.ts (GAS, opportunity-capability, experiment, …).
// ============================================================================

export async function canvasInterviewReply(
  interviewSystem: string,
  subjectLabel: string,
  subject: string,
  history: ChatMsg[]
): Promise<string> {
  const ctx = subject
    ? `Their ${subjectLabel}: ${subject}`
    : `They haven't named the ${subjectLabel} yet; open by asking what it is.`;
  const conversation: ChatMsg[] = history.length
    ? history
    : [{ role: "user", content: `Please begin — ask your first question about my ${subjectLabel}.` }];
  return complete(
    [{ role: "system", content: `${interviewSystem}\n\n${ctx}` }, ...conversation],
    { temperature: 0.7 }
  );
}

export async function canvasDraftAI(
  def: CanvasDef,
  subject: string,
  transcript: string
): Promise<{ fields: Record<string, any>; synthesis: string; verdict?: string; score?: number; _raw?: string }> {
  const fieldLines = def.fields
    .map((f) => {
      const t = f.kind === "list" ? "array of 2–4 short strings" : "string";
      return `  "${f.key}": ${t},   // ${f.label}: ${f.hint || ""}`;
    })
    .join("\n");
  const extra: string[] = [`  "synthesis": string   // 2–3 sentences, second person, summarizing the canvas`];
  if (def.hasVerdict) extra.push(`  "verdict": string   // ${def.hasVerdict.label} — one sharp sentence`);
  if (def.hasScore) extra.push(`  "score": integer 0–100   // ${def.hasScore.label}`);
  if (def.ratings?.length) {
    const rl = def.ratings.map((r) => `"${r.key}": integer 0–100`).join(", ");
    extra.push(`  "ratings": { ${rl} }   // score each dimension; spread them, be discerning`);
  }
  if (def.frontier) {
    extra.push(
      `  "frontier": { "x": integer 0–100, "y": integer 0–100 }   // Place the workflow on the Generality–Accuracy frontier. x = required GENERALITY (0 = one narrow context, 100 = must handle many varied contexts). y = required ACCURACY (0 = loose/errors cheap, 100 = must be exact, errors costly). Be honest — a point far up-right demands high hidden complexity.`
    );
  }

  const system = `${def.draftSystem}

Return STRICT JSON only — no prose, no code fences:
{
${fieldLines}
${extra.join("\n")}
}
Rules: fill EVERY field, grounded in the interview and specific to this ${def.subjectLabel}. List fields get 2–4 tight items. No vague filler.`;

  const user = `The ${def.subjectLabel}: ${subject || "(unnamed)"}\n\nInterview:\n${transcript || "(none)"}`;
  const raw = await complete(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0.4 }
  );
  try {
    const p = extractJson(raw);
    const fields: Record<string, any> = {};
    for (const f of def.fields) {
      const v = p[f.key];
      if (f.kind === "list") fields[f.key] = Array.isArray(v) ? v.slice(0, 6).map((x: any) => String(x)) : [];
      else fields[f.key] = String(v || "");
    }
    const out: any = { fields, synthesis: String(p.synthesis || ""), _raw: raw };
    if (def.hasVerdict) out.verdict = String(p.verdict || "");
    const clamp = (v: any) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : undefined);
    if (def.hasScore) out.score = clamp(p.score);
    if (def.ratings?.length) {
      const ratings: Record<string, number> = {};
      for (const r of def.ratings) {
        const v = clamp(p.ratings?.[r.key]);
        if (v !== undefined) ratings[r.key] = v;
      }
      out.ratings = ratings;
    }
    if (def.frontier) {
      const x = clamp(p.frontier?.x);
      const y = clamp(p.frontier?.y);
      if (x !== undefined && y !== undefined) out.frontier = { x, y };
    }
    return out;
  } catch {
    return { fields: {}, synthesis: "", _raw: raw };
  }
}
