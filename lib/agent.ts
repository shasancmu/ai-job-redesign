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
  {
    key: "skeptic",
    label: "Skeptic",
    persona: "A time-poor senior leader who assumes this is fluff. Suspicious of anything that feels like a quiz, a gimmick, or generic AI output. Needs to see rigor and a real, defensible result fast, or dismisses it. Quick to call out where the exercise feels shallow, leading, or unearned.",
  },
  {
    key: "struggling",
    label: "Struggling learner",
    persona: "Someone less confident and less fluent — English is their second language, they're new to the topic, and they get lost when instructions assume prior knowledge or use jargon. Notices every place the experience isn't accessible, over-assumes, or doesn't scaffold. Needs clarity and encouragement.",
  },
  {
    key: "expert",
    label: "Domain expert",
    persona: "A deep expert in this subject who will spot anything wrong, oversimplified, or pedagogically weak. Judges whether the exercise actually teaches the real skill or just simulates it, and whether the feedback/output is genuinely insightful rather than plausible-sounding filler.",
  },
  {
    key: "hurried",
    label: "Hurried mobile user",
    persona: "On their phone between meetings, thumb-typing, half-distracted. Will abandon anything with too much reading, too many steps, or friction on a small screen. A stress test for length, pacing, and whether the payoff arrives before their attention runs out.",
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

// Run the whole persona panel (or a subset) over one module, in parallel.
export async function runAgentPanel(admin: any, mod: { slug: string; name: string; what: string }, roleKeys: string[]): Promise<AgentNote[]> {
  const keys = roleKeys.length ? roleKeys : AGENT_ROLES.map((r) => r.key);
  const notes = await Promise.all(keys.map((k) => runAgentOnModule(admin, mod, k).catch(() => null)));
  return notes.filter(Boolean) as AgentNote[];
}

// A paste-ready improvement brief for Claude Code: consolidated across personas,
// with the live URL to drive and reproduce.
export function claudeCodeBrief(moduleName: string, slug: string, notes: AgentNote[]): string {
  const runUrl = `superadditive.app/start/${slug}`;
  const avg = notes.length ? (notes.reduce((s, n) => s + (n.rating || 0), 0) / notes.length).toFixed(1) : "—";
  const lines: string[] = [];
  lines.push(`# QA: improve the "${moduleName}" module`);
  lines.push(``);
  lines.push(`Run it live at ${runUrl} to reproduce, then fix these findings from a synthetic-user QA panel (avg ${avg}/5 across ${notes.length} personas).`);
  lines.push(``);
  lines.push(`## Fix first`);
  for (const n of notes) if (n.one_thing) lines.push(`- **(${roleLabel(n.role)}, ${n.rating}/5)** ${n.one_thing}`);
  const friction = [...new Set(notes.flatMap((n) => n.friction))];
  if (friction.length) { lines.push(``); lines.push(`## Friction observed`); for (const f of friction) lines.push(`- ${f}`); }
  const ideas = [...new Set(notes.flatMap((n) => n.suggestions))];
  if (ideas.length) { lines.push(``); lines.push(`## Ideas`); for (const s of ideas) lines.push(`- ${s}`); }
  lines.push(``);
  lines.push(`## Per-persona takes`);
  for (const n of notes) lines.push(`- **${roleLabel(n.role)}** (${n.rating}/5): "${n.summary}"`);
  return lines.join("\n");
}

function roleLabel(key: string): string { return AGENT_ROLES.find((r) => r.key === key)?.label || key; }

export async function listAgentFeedback(admin: any, limit = 300): Promise<AgentNote[]> {
  try {
    const { data } = await admin.from("agent_feedback").select("*").order("created_at", { ascending: false }).limit(limit);
    return ((data as any[]) || []).map(mapNote);
  } catch { return []; }
}
