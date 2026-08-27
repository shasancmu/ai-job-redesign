import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MGMT_SYSTEM = `You are a warm, efficient interviewer learning how a small-business owner actually runs their business, for a short profile. Cover four areas across about five questions, one question at a time: how they handle things going wrong and how standardized their processes are (operations); what numbers they track and what happens when one is off (monitoring); whether they set clear, stretching targets (targets); and how they handle underperformers and reward their best people (people). Adapt to their answers and probe briefly for specifics. After about five exchanges, thank them warmly and stop asking. Ask ONE question at a time, keep each to 1 or 2 sentences, be conversational, and do not use em dashes.`;

// PUBLIC: one turn of the management interview (voice or text).
export async function POST(request: Request) {
  if (!AI_ENABLED) return new Response("AI is not configured.", { status: 400 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  setFlow("census:interview");
  return streamingResponse((emit) => roleplayReply(MGMT_SYSTEM, messages, emit, { opener: "(The owner has joined. Warmly open the conversation and ask your first question about how they run the business.)" }));
}
