import { MODULES } from "@/lib/modules";
import { syntheticLearnerAI } from "@/lib/ai";

// The self-improvement agent. A synthetic user runs a module (in a role) and
// records how it went + the single highest-value fix. Roles start with the basic
// learner; more personas plug in here later (skeptic, expert, struggling, etc.).
export const AGENT_ROLES: { key: string; label: string; persona: string }[] = [
  {
    key: "learner",
    label: "Basic learner",
    persona: "A busy mid-career professional trying this for the first time — genuinely curious about the payoff, but easily distracted and low on patience. Bails quickly if instructions are vague, the value isn't obvious fast, or anything is confusing or slow. Rewards a clear promise and a concrete, keepable result.",
  },
];

export type AgentNote = {
  id: string; module_slug: string; module_name: string; role: string;
  rating: number | null; worked: string[]; friction: string[];
  suggestions: string[]; one_thing: string; summary: string; created_at: string;
};

// The modules the agent works through (the visible library).
export function agentModules(): { slug: string; name: string; what: string }[] {
  return (MODULES as any[])
    .filter((m) => !m.hidden)
    .map((m) => ({ slug: m.slug, name: m.name, what: m.description || m.tagline || "" }));
}

function mapNote(r: any): AgentNote {
  return {
    id: r.id, module_slug: r.module_slug, module_name: r.module_name || r.module_slug, role: r.role,
    rating: r.rating, worked: r.worked || [], friction: r.friction || [],
    suggestions: r.suggestions || [], one_thing: r.one_thing || "", summary: r.summary || "", created_at: r.created_at,
  };
}

export async function runAgentOnModule(admin: any, mod: { slug: string; name: string; what: string }, roleKey: string): Promise<AgentNote | null> {
  const role = AGENT_ROLES.find((r) => r.key === roleKey) || AGENT_ROLES[0];
  const res = await syntheticLearnerAI({ persona: role.persona, role: role.label, moduleName: mod.name, what: mod.what });
  const { data } = await admin.from("agent_feedback").insert({
    module_slug: mod.slug, module_name: mod.name, role: role.key,
    rating: res.rating, worked: res.worked, friction: res.friction, suggestions: res.suggestions,
    one_thing: res.one_thing, summary: res.summary,
  }).select("*").single();
  return data ? mapNote(data) : null;
}

// Pick the N modules most in need of a look: never-reviewed first, then oldest.
export async function pickStaleModules(admin: any, roleKey: string, n: number): Promise<{ slug: string; name: string; what: string }[]> {
  const mods = agentModules();
  const lastByModule = new Map<string, number>();
  try {
    const { data } = await admin.from("agent_feedback").select("module_slug, created_at").eq("role", roleKey).order("created_at", { ascending: false }).limit(2000);
    for (const r of (data as any[]) || []) {
      const t = new Date(r.created_at).getTime();
      if (!lastByModule.has(r.module_slug) || t > lastByModule.get(r.module_slug)!) lastByModule.set(r.module_slug, t);
    }
  } catch { /* table absent → everything is stale */ }
  return [...mods].sort((a, b) => (lastByModule.get(a.slug) || 0) - (lastByModule.get(b.slug) || 0)).slice(0, n);
}

export async function listAgentFeedback(admin: any, limit = 300): Promise<AgentNote[]> {
  try {
    const { data } = await admin.from("agent_feedback").select("*").order("created_at", { ascending: false }).limit(limit);
    return ((data as any[]) || []).map(mapNote);
  } catch { return []; }
}
