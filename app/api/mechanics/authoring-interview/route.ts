import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, authoringInterviewReply, moduleCopilotAI } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Interviews the INSTRUCTOR to figure out what module to build. The questions are
// designed to surface the signals that pick a module type and to gather the
// specifics a copilot needs. Grounded in uploaded materials when present.
function interviewerSystem(source: string, voice: boolean): string {
  return `You are a warm, sharp learning designer interviewing an instructor to help them build ONE interactive learning module. Your goal is to learn enough to recommend the right FORMAT and fill in the specifics.

Draw out, across the conversation:
- The single thing a learner should be able to DO after this (not "know about").
- Who the learners are and what is hard for them about it.
- Whether the skill is a judgment call, a negotiation, applying a framework to their own situation, recall of concepts, analyzing/auditing something, or being taught a concept clearly.
- The concrete situation, characters, stakes, or materials it should be built on.

Rules:
- Ask ONE question at a time. Keep each turn to 1-2 sentences.${voice ? " This is spoken aloud, so be conversational and brief, no lists or markdown." : ""}
- Be non-directive: follow what they say, go for breadth before depth, keep momentum.
- Open by ${source ? "briefly noting you read their materials and asking what they most want learners to be able to do after this." : "asking what they want their learners to be able to do, and what topic or situation it is about."}
- After roughly 5-6 exchanges, when you have enough, say one warm closing line telling them to hit "See what I can build" whenever they are ready. Do not keep interviewing past that.
- Never propose the module yourself in the chat; that happens after.${source ? `\n\nThe instructor uploaded these materials (for grounding, do not read them back verbatim):\n${source.slice(0, 8000)}` : ""}`;
}

const ROUTER = `You help a busy instructor turn an interview (and any uploaded materials) into interactive learning modules. From the conversation, propose a MENU of 2 to 4 genuinely good modules to build, best first. Prefer the format that fits what they actually described.

The module types:
- roleplay: the learner interrogates an AI character who won't lie but will spin, under a hidden truth, and must judge under uncertainty. Best for: detecting deception, diligence, eliciting from a guarded source, reading a person.
- interview: an AI interviews the learner about their own situation, then drafts a structured framework canvas / scorecard / verdict. Best for: applying a framework to the learner's own case.
- negotiation: the learner negotiates a scored deal against an AI counterpart with a hidden payoff table. Best for: bargaining, deal-making, trade-offs.
- benchmark: a timed multiple-choice quiz, scored server-side, that also measures the learner's calibration. Best for: recall or understanding of concepts.
- analytical: the learner pastes a subject; the AI decomposes it into units scored against a scale the author defines. Best for: X-ray / audit analysis.
- redesign: two learners interview each other, then redesign each other's work on an instrument (a live paired session).
- explainer: a taught, guided walkthrough that explains a topic section by section.
- newsframe: the learner applies a business framework to a real, current news story pulled live.

Output ONLY JSON: {"options":[{"kind":"<one type key>","title":"a short module name","concept":"a specific one-paragraph brief for that type's copilot, naming the situation, the characters/subject, and what the learner should walk away able to do, grounded in what the instructor said","rationale":"one sentence on why this fits what they described"}]}. 2 to 4 options, best first. No em dashes.`;

export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const messages = Array.isArray(body.messages) ? body.messages.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") : [];
  const source = String(body.sourceText || "").slice(0, 12000);

  if (body.mode === "report") {
    setFlow("mechanics:authoring-interview:report");
    const transcript = messages.map((m: any) => `${m.role === "user" ? "Instructor" : "Interviewer"}: ${m.content}`).join("\n");
    const input = [transcript ? `INTERVIEW:\n${transcript}` : "", source ? `\nUPLOADED MATERIALS:\n${source}` : ""].join("\n").trim();
    if (!input) return Response.json({ error: "Nothing to build from yet." }, { status: 400 });
    try {
      const routed: any = await moduleCopilotAI(ROUTER, input);
      const options = Array.isArray(routed?.options) ? routed.options.filter((o: any) => o && typeof o.kind === "string" && o.kind.trim()) : [];
      if (!options.length) return Response.json({ error: "Couldn't turn the conversation into module ideas. Keep talking a little more." }, { status: 502 });
      return Response.json({ options, transcript });
    } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
  }

  // Default: chat — stream the next question.
  setFlow("mechanics:authoring-interview:chat");
  const system = interviewerSystem(source, !!body.voice);
  try {
    return streamingResponse((emit) => authoringInterviewReply(system, messages, emit));
  } catch (e: any) {
    return Response.json({ error: e?.message || "The interviewer is unavailable." }, { status: 502 });
  }
}
