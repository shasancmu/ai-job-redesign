import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/orgs";
import { AI_ENABLED, portraitInterviewReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { setFlow } from "@/lib/aiflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One turn of the learner's own portrait interview. Authenticated — the person
// is talking about themselves, willingly. No profiling behind their back.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "This isn't available right now." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  const org = await getActiveOrg(user).catch(() => null);
  let learnerName: string | undefined;
  try {
    const admin = createAdminClient();
    const { data: prof } = await admin.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    learnerName = (prof as any)?.display_name || undefined;
  } catch { /* optional */ }

  setFlow("portrait:interview");
  return streamingResponse((emit) => portraitInterviewReply(history, { orgName: org?.name, learnerName }, emit));
}
