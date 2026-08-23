import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, tutorReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The "How AI works" lesson tutor. Auth-gated, streamed.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  setFlow("tutor:ask");
  const topic = String(body.topic || "how AI works").slice(0, 200);
  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  return streamingResponse((emit) => tutorReply(topic, messages, emit));
}
