import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CONFIG, coerceConfig, scoreConfig } from "@/lib/benchmark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no-auth. Scores the taker server-side (answers never travel back to
// the client) and records an ANONYMOUS submission keyed by the session code.
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = String(body.code || "").toUpperCase().trim();
  const answers: Record<string, string> = body.answers && typeof body.answers === "object" ? body.answers : {};
  if (!code) return Response.json({ error: "Missing code." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin.from("quiz_sessions").select("id, status").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "That code isn't valid." }, { status: 404 });
  if (session.status === "closed") return Response.json({ error: "This quiz is closed." }, { status: 409 });

  const { data } = await admin.from("benchmark_config").select("data").eq("id", "default").maybeSingle();
  const cfg = coerceConfig(data?.data || DEFAULT_CONFIG);
  const score = scoreConfig(cfg, answers);
  const total = cfg.questions.length;

  const { error } = await admin.from("quiz_submissions").insert({ session_id: session.id, score, total });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Only the score goes back to the phone. The "vs the machine" reveal is the
  // presenter's stage moment, never spoiled on the participant's device.
  return Response.json({ score, total });
}
