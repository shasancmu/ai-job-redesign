// The one seam every engine uses to persist a business conversation — both
// sides, text or voice-as-transcript. Best-effort and idempotent: it never
// blocks the learner, and re-logging a conversation replaces its turns. Consent
// is granted at signup (the fine print); a future per-user opt-out would gate
// this call. See sql/conversations.sql.

import { createAdminClient } from "@/lib/supabase/admin";

export type Turn = { speaker: "ai" | "human"; text: string; modality?: "text" | "voice" };

// Normalize a chat-style messages array ([{role:'user'|'assistant', content}]) into
// turns. Voice interviews already carry transcribed text, so pass modality "voice".
export function messagesToTurns(messages: any[], modality: "text" | "voice" = "text"): Turn[] {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ speaker: (m.role === "user" ? "human" : "ai") as "ai" | "human", text: String(m.content).slice(0, 8000), modality }));
}

// The A/B variant applied to this run (denormalized onto the header for the
// dataset; the authoritative link is experiment_assignments by conversation_id).
export async function variantForRun(admin: any, conversationId: string): Promise<string | null> {
  try {
    const { data } = await admin.from("experiment_assignments").select("variant_key").eq("session_id", conversationId).limit(1);
    return (data && data[0]?.variant_key) || null;
  } catch { return null; }
}

export async function logConversation(input: {
  conversationId: string;
  personId: string;
  module: string;
  cohort?: string | null;
  turns?: Turn[];
  outcome?: number | null;
  realOutcome?: number | null;
  intervention?: string | null;
  dynamics?: Record<string, any> | null;
  ended?: boolean;
}): Promise<void> {
  if (!input.conversationId || !input.personId) return;
  try {
    const admin = createAdminClient();
    const header: any = {
      conversation_id: input.conversationId,
      person_id: input.personId,
      module: input.module || null,
      updated_at: new Date().toISOString(),
    };
    if (input.cohort !== undefined) header.cohort = input.cohort;
    if (input.outcome !== undefined) header.outcome = input.outcome;
    if (input.realOutcome !== undefined) header.real_outcome = input.realOutcome;
    if (input.intervention !== undefined) header.intervention = input.intervention;
    if (input.dynamics !== undefined) header.dynamics = input.dynamics;
    if (input.ended) header.ended_at = new Date().toISOString();
    await admin.from("conversations").upsert(header, { onConflict: "conversation_id" });

    if (input.turns && input.turns.length) {
      await admin.from("conversation_turns").delete().eq("conversation_id", input.conversationId);
      await admin.from("conversation_turns").insert(input.turns.map((t, i) => ({
        conversation_id: input.conversationId, person_id: input.personId, module: input.module || null,
        turn_index: i, speaker: t.speaker, text: t.text, modality: t.modality || "text",
      })));
    }
  } catch { /* store not migrated / transient — never block the learner */ }
}
