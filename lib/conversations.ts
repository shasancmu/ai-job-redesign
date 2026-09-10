// Server-only reads over the conversation spine (see sql/conversations.sql and
// lib/conversationLog.ts). Superadmin research surface + the rollups the
// autonomous experiment loop reads. Never import this into a "use client" file.

import { createAdminClient } from "@/lib/supabase/admin";
import type { Dynamics } from "@/lib/conversationDynamics";

export type ConversationRow = {
  conversation_id: string;
  person_id: string;
  module: string | null;
  cohort: string | null;
  intervention: string | null;
  outcome: number | null;
  real_outcome: number | null;
  dynamics: Dynamics | null;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
};

export type ConversationTurn = {
  turn_index: number;
  speaker: "ai" | "human";
  text: string | null;
  modality: string;
  created_at: string;
};

export type ConvFilters = { module?: string; cohort?: string; intervention?: string; limit?: number };

// A page of conversation headers, newest first, with optional filters.
export async function listConversations(f: ConvFilters = {}): Promise<ConversationRow[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from("conversations").select("*").order("updated_at", { ascending: false }).limit(Math.min(500, f.limit || 200));
    if (f.module) q = q.eq("module", f.module);
    if (f.cohort) q = q.eq("cohort", f.cohort);
    if (f.intervention) q = q.eq("intervention", f.intervention);
    const { data } = await q;
    return (data || []) as ConversationRow[];
  } catch { return []; }
}

export async function getConversation(id: string): Promise<{ header: ConversationRow | null; turns: ConversationTurn[] }> {
  try {
    const admin = createAdminClient();
    const { data: header } = await admin.from("conversations").select("*").eq("conversation_id", id).maybeSingle();
    const { data: turns } = await admin.from("conversation_turns").select("turn_index, speaker, text, modality, created_at").eq("conversation_id", id).order("turn_index", { ascending: true });
    return { header: (header as ConversationRow) || null, turns: (turns || []) as ConversationTurn[] };
  } catch { return { header: null, turns: [] }; }
}

// The distinct values available for the filter dropdowns.
export async function conversationFacets(): Promise<{ modules: string[]; cohorts: string[]; interventions: string[]; total: number }> {
  try {
    const admin = createAdminClient();
    const { data, count } = await admin.from("conversations").select("module, cohort, intervention", { count: "exact" }).limit(5000);
    const rows = (data || []) as any[];
    const uniq = (xs: any[]) => [...new Set(xs.filter((x) => x != null && x !== ""))].sort() as string[];
    return {
      modules: uniq(rows.map((r) => r.module)),
      cohorts: uniq(rows.map((r) => r.cohort)),
      interventions: uniq(rows.map((r) => r.intervention)),
      total: count || rows.length,
    };
  } catch { return { modules: [], cohorts: [], interventions: [], total: 0 }; }
}

export type InterventionRollup = {
  intervention: string;
  n: number;
  finished: number;
  avgDepth: number | null;
  avgMovement: number | null;
  avgOutcome: number | null;
  avgReal: number | null;
};

// Group a module's conversations by the A/B intervention they ran under and
// average the leading signals (depth, movement) and the outcomes. This is the
// "is the conversation moving forward, and does it end in value?" view — and the
// exact table the autopilot reads to decide where to push next.
export async function interventionRollup(module?: string): Promise<InterventionRollup[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from("conversations").select("intervention, outcome, real_outcome, dynamics, ended_at").limit(5000);
    if (module) q = q.eq("module", module);
    const { data } = await q;
    const rows = (data || []) as any[];
    const groups = new Map<string, any[]>();
    for (const r of rows) {
      const key = r.intervention || "(none)";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const out: InterventionRollup[] = [];
    for (const [intervention, g] of groups) {
      const depths = g.map((r) => r.dynamics?.depth).filter((x: any) => typeof x === "number");
      const moves = g.map((r) => r.dynamics?.movement).filter((x: any) => typeof x === "number");
      const outs = g.map((r) => r.outcome).filter((x: any) => typeof x === "number");
      const reals = g.map((r) => r.real_outcome).filter((x: any) => typeof x === "number");
      out.push({
        intervention,
        n: g.length,
        finished: g.filter((r) => !!r.ended_at).length,
        avgDepth: round1(mean(depths)),
        avgMovement: round2(mean(moves)),
        avgOutcome: round1(mean(outs)),
        avgReal: round1(mean(reals)),
      });
    }
    return out.sort((a, b) => b.n - a.n);
  } catch { return []; }
}

function round1(x: number | null): number | null { return x == null ? null : Math.round(x * 10) / 10; }
function round2(x: number | null): number | null { return x == null ? null : Math.round(x * 100) / 100; }

// A short pseudonymous handle for a person_id, so the research surface is
// readable without splashing raw UUIDs around.
export function personHandle(id: string): string {
  return "p-" + (id || "").replace(/-/g, "").slice(0, 6);
}
