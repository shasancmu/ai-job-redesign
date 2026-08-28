import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess } from "@/lib/orgs";
import { AI_ENABLED, cohortChatReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { gatherCohortDigest } from "@/lib/cohortData";
import { setFlow } from "@/lib/aiflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Let an instructor chat with everything their cohort has done. Grounded strictly
// in a digest of the cohort's own data; permission-checked to that cohort.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const access = await facilitatorAccess(user);
  if (!access.ok) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const cohort = String(body.cohort || "").trim().toUpperCase();
  if (!cohort) return Response.json({ error: "Pick a cohort." }, { status: 400 });
  const messages = Array.isArray(body.messages) ? body.messages.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") : [];

  let admin;
  try { admin = createAdminClient(); } catch { return Response.json({ error: "service role not set" }, { status: 500 }); }

  // Permission: you must own this cohort, be a director of its org, or superadmin.
  const { data: klass } = await admin.from("classes").select("owner_id, org_id, name").eq("code", cohort).maybeSingle();
  if (!klass) return Response.json({ error: "Unknown cohort." }, { status: 404 });
  const orgId = (klass as any).org_id as string | null;
  const allowed = access.superadmin || (klass as any).owner_id === user.id || (!!orgId && access.orgIds.includes(orgId));
  if (!allowed) return Response.json({ error: "You don't run that cohort." }, { status: 403 });

  const digest = await gatherCohortDigest(admin, cohort);
  if (digest.empty) return Response.json({ error: "This cohort has no activity yet, so there's nothing to chat about." }, { status: 400 });

  setFlow("facilitator:cohort-chat");
  const system = `You are a sharp teaching assistant helping an instructor understand their cohort. Answer their questions using ONLY the cohort data below. Be concrete: cite numbers, name patterns, and quote what people actually wrote. When the data does not cover something, say so plainly rather than guessing. Keep answers tight and useful, and surface what an instructor would act on (who is struggling, what concept is missing, what to reinforce next). No em dashes.

=== COHORT DATA ===
${digest.text}
=== END DATA ===`;

  try {
    return streamingResponse((emit) => cohortChatReply(system, messages, emit));
  } catch (e: any) {
    return Response.json({ error: e?.message || "The assistant is unavailable." }, { status: 502 });
  }
}
