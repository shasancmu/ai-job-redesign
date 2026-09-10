import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { withLanguage } from "@/lib/lang";
import { selectScenario, characterSystem } from "@/lib/mechanics/roleplay";
import { getSpec, characterRole } from "@/lib/mechanics/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";
import { logConversation, messagesToTurns } from "@/lib/conversationLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generic role-play turn: any ModuleSpec. The active scenario and the character's
// answer key are resolved server-side and never leave the server.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "");
  const code = String(body.code || "");
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const persona = typeof body.persona === "string" ? body.persona.slice(0, 800) : undefined;
  if (!slug || !code) return Response.json({ error: "missing slug or code" }, { status: 400 });

  const spec = await getSpec(slug);
  if (!spec) return Response.json({ error: "unknown module" }, { status: 404 });
  const role = characterRole(spec);
  if (!role) return Response.json({ error: "module has no character" }, { status: 400 });

  const scn = selectScenario(spec, code);
  // For a learner-chosen-persona role, their text fills the persona slot (still
  // untrusted; the immutable behavior + rails still bind it).
  const baseSystem = characterSystem(spec, role, scn, role.openPersona ? persona : undefined);
  // A/B experiment: a running experiment on this module (flow = slug, target
  // interview) subtly nudges the character. Assignment is sticky per run code.
  let nudge = "";
  try { nudge = await experimentNudge(createAdminClient(), code, slug, "interview"); } catch { /* experiments optional */ }
  const system = nudge ? `${baseSystem}\n\nEXPERIMENT NOTE (stay in character, keep it subtle): ${nudge}` : baseSystem;
  // Persist the conversation (both sides) — the platform's core data substrate.
  try { await logConversation({ conversationId: code, personId: user.id, module: slug, turns: messagesToTurns(messages), cohort: body.cohort || null }); } catch { /* logging optional */ }
  setFlow(`roleplay:${slug}`);
  const lang = spec.guardrails?.language;
  return streamingResponse((emit) => withLanguage(lang && lang !== "en" ? lang : undefined, () =>
    roleplayReply(system, messages, emit, { low: false, opener: "(The exercise has begun. Open in character.)" })
  ));
}
