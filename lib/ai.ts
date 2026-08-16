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

async function complete(
  messages: ChatMsg[],
  opts: { json?: boolean; temperature?: number } = {}
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
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const INTERVIEWER_SYSTEM = `You are a warm, sharp interviewer helping a professional reimagine their job for the age of AI. You are their thinking partner, not a chatbot.

Rules:
- Ask exactly ONE question at a time. Keep it to 1-3 sentences.
- Start by understanding what they actually do day to day.
- Then dig into: what drains them, what only they can do, where their judgment matters, what they'd love to spend more time on.
- Reflect back what you hear in a phrase before asking the next question.
- Do not give advice or redesign their job yet. Just interview.
- After about 5 exchanges, ask if there's anything else, then stop.`;

export async function interviewReply(
  history: ChatMsg[],
  job: { title?: string; description?: string }
): Promise<string> {
  const context =
    job.title || job.description
      ? `The person's job: ${job.title || "(untitled)"} — ${job.description || ""}`
      : "The person hasn't described their job yet; open by asking what they do.";
  const messages: ChatMsg[] = [
    { role: "system", content: `${INTERVIEWER_SYSTEM}\n\n${context}` },
    ...history,
  ];
  return complete(messages, { temperature: 0.7 });
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
      content: `You are coaching someone mid-interview to go deeper. The goal is to uncover the real VALUE the other person creates — for the end customer, the organization, and their manager — and what only this person can do (judgment, taste, relationships, trust), NOT their tasks or work product.
Given the notes so far, respond with exactly THREE short, sharp follow-up questions to ask next, each grounded in what they've already learned (not generic). Then one line beginning "Probe:" naming a likely hidden source of value worth chasing. Keep it tight. Format:
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
  history: ChatMsg[],
  job: { title?: string; description?: string }
): Promise<{ grid: Record<string, string[]>; new_job_description: string }> {
  const transcript = history
    .map((m) => `${m.role === "user" ? "Them" : "Interviewer"}: ${m.content}`)
    .join("\n");
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `You redesign jobs using a 2x4 model. AI cells: ${AI_LABELS}. Human cells: ${HUMAN_LABELS}.
Given an interview, return STRICT JSON only, no prose, shaped exactly:
{"grid":{"search":[],"structure":[],"think":[],"translate":[],"lead":[],"own":[],"judge":[],"integrate":[]},"new_job_description":""}
Put 1-3 short verb phrases in each relevant cell (leave cells empty if they don't apply). new_job_description is 2-3 sentences describing the reimagined role: what the human owns, what AI handles, why it's better. Second person ("You...").`,
    },
    {
      role: "user",
      content: `Job: ${job.title || "(untitled)"} — ${job.description || ""}\n\nInterview:\n${transcript}`,
    },
  ];
  const raw = await complete(messages, { json: true, temperature: 0.4 });
  try {
    const parsed = JSON.parse(raw);
    const keys = ["search", "structure", "think", "translate", "lead", "own", "judge", "integrate"];
    const grid: Record<string, string[]> = {};
    for (const k of keys) grid[k] = Array.isArray(parsed.grid?.[k]) ? parsed.grid[k].slice(0, 5).map(String) : [];
    return { grid, new_job_description: String(parsed.new_job_description || "") };
  } catch {
    return {
      grid: { search: [], structure: [], think: [], translate: [], lead: [], own: [], judge: [], integrate: [] },
      new_job_description: raw.slice(0, 800),
    };
  }
}
