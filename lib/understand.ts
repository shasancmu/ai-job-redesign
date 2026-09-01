// ============================================================================
// Understanding — the "specialize in people" layer. It turns the app's own data
// into what a teacher would want to KNOW about a person so they can genuinely
// care. This is understanding-to-care, NOT a targeting dossier: it never scores
// "likelihood to buy" and never feeds a funnel. Staff-only, scoped to the org.
// ============================================================================
import { gatherPerson, type PersonProfile } from "@/lib/relationships";
import { gatherCareOS, type CareOS } from "@/lib/relationshipOS";
import { SEGMENTS, GOALS, classifyEmail, recommendedSlugs } from "@/lib/segments";
import { MODULES } from "@/lib/modules";
import type { RoleInfo } from "@/lib/orgs";

export type Who = {
  email: string | null;
  emailType: string;
  domain: string;
  segment: string | null; segmentLabel: string | null;
  goal: string | null; goalLabel: string | null;
  level: string | null;
  teamSize: string | null;
  founderStage: string | null;
  studyField: string | null;
  language: string | null;
};

export type Understanding = {
  person: PersonProfile;
  who: Who;
  recommended: { slug: string; name: string; emoji: string }[]; // what would fit them next
  work: string; // excerpts of what they actually produced — their own responses
  portrait: any | null; // the self-portrait they gave in the portrait interview (their words)
};

// What the person actually made and said — their workflow redesigns (in their own
// words), roleplay outcomes, and module summaries. This is the substance behind
// "what would help them", grounded in their responses, not just which modules
// they touched. Bounded and truncated. Staff-only, org-scoped.
export async function gatherWork(admin: any, userId: string, org: { id: string }): Promise<string> {
  const { data: classes } = await admin.from("classes").select("id, code").eq("org_id", org.id);
  const codes = ((classes as any[]) || []).map((c) => c.code).filter(Boolean).slice(0, 4000);
  const clip = (s: any, n = 240) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const parts: string[] = [];

  let sessionIds: string[] = [];
  if (codes.length) {
    const { data: sess } = await admin.from("sessions").select("id").in("cohort", codes)
      .or(`host_id.eq.${userId},guest_id.eq.${userId}`).order("created_at", { ascending: false }).limit(30);
    sessionIds = ((sess as any[]) || []).map((s) => s.id);
  }
  if (sessionIds.length) {
    const { data: wf } = await admin.from("workflow_docs").select("name, why, success, failure, better").in("session_id", sessionIds.slice(0, 20));
    for (const w of ((wf as any[]) || []).slice(0, 4)) {
      const bits = [w.name && `"${clip(w.name, 100)}"`, w.why && `why it matters: ${clip(w.why)}`, w.success && `success = ${clip(w.success)}`, w.failure && `failure = ${clip(w.failure)}`, w.better && `wants to improve: ${clip(w.better)}`].filter(Boolean);
      if (bits.length) parts.push("Workflow they redesigned — " + bits.join("; "));
    }
  }

  const { data: rp } = await admin.from("roleplay_results").select("scenario, score, verdict").eq("user_id", userId).order("created_at", { ascending: false }).limit(4);
  for (const r of ((rp as any[]) || [])) {
    const v = r.verdict && typeof r.verdict === "object" ? (r.verdict.summary || r.verdict.headline || r.verdict.note || "") : "";
    parts.push(`Role-play "${clip(r.scenario, 80)}"${r.score != null ? ` (scored ${r.score})` : ""}${v ? `: ${clip(v)}` : ""}`);
  }

  const { data: mr } = await admin.from("mechanics_results").select("slug, summary, score").eq("user_id", userId).order("created_at", { ascending: false }).limit(4);
  for (const m of ((mr as any[]) || [])) {
    if (m.summary) parts.push(`${clip(m.slug, 60)}: ${clip(m.summary)}`);
  }

  return parts.slice(0, 10).join("\n");
}

// One person, understood. Returns null if they aren't in this org (gatherPerson
// enforces that boundary).
export async function gatherUnderstanding(admin: any, org: { id: string; name: string }, userId: string): Promise<Understanding | null> {
  const person = await gatherPerson(admin, org, userId);
  if (!person) return null;

  const { data: prof } = await admin
    .from("profiles").select("segment, goal, level, team_size, founder_stage, study_field, language")
    .eq("id", userId).maybeSingle();
  const p = (prof as any) || {};

  let email: string | null = null;
  try { const { data: u } = await admin.auth.admin.getUserById(userId); email = u?.user?.email || null; } catch { /* ignore */ }
  const ec = classifyEmail(email);

  const who: Who = {
    email, emailType: ec.type, domain: ec.domain,
    segment: p.segment || null, segmentLabel: SEGMENTS.find((s) => s.key === p.segment)?.label || null,
    goal: p.goal || null, goalLabel: GOALS.find((g) => g.key === p.goal)?.label || null,
    level: p.level || null, teamSize: p.team_size || null, founderStage: p.founder_stage || null,
    studyField: p.study_field || null, language: p.language || null,
  };

  // What would fit them next — grounded in their own stated goal/segment, minus
  // what they've already done. This is "what would help", not "what to sell".
  const doneNames = new Set(person.timeline.filter((t) => t.done).map((t) => t.name));
  const valid = new Set(MODULES.map((m) => m.slug));
  const recommended = recommendedSlugs({ segment: p.segment, goal: p.goal }, valid, 6)
    .map((slug) => { const m = MODULES.find((x) => x.slug === slug); return { slug, name: m?.name || slug, emoji: (m as any)?.emoji || "•" }; })
    .filter((r) => !doneNames.has(r.name))
    .slice(0, 4);

  const work = await gatherWork(admin, userId, org);

  // The self-portrait they gave — their own words about themselves, the richest
  // and most consented evidence there is.
  let portrait: any = null;
  try {
    const { data: lp } = await admin.from("learner_portrait").select("portrait").eq("user_id", userId).eq("org_id", org.id).maybeSingle();
    portrait = (lp as any)?.portrait || null;
  } catch { /* table not migrated */ }

  return { person, who, recommended, work, portrait };
}

// Assemble the "who they are" facts and journey into two prose blocks the AI can
// reason over for the understanding brief.
export function briefInputs(u: Understanding): { who: string; journey: string; peers: string; work: string; portrait: string } {
  const w = u.who;
  const whoLines = [
    w.segmentLabel && `Says they are: ${w.segmentLabel}`,
    w.goalLabel && `Here to: ${w.goalLabel}`,
    w.studyField && `Field of study: ${w.studyField}`,
    w.teamSize && `Team size: ${w.teamSize}`,
    w.founderStage && `Founder stage: ${w.founderStage}`,
    w.level && `Level: ${w.level}`,
    w.language && w.language !== "English" && `Prefers: ${w.language}`,
    w.emailType === "corporate" && w.domain && `Signed up with a work email (${w.domain})`,
    w.emailType === "education" && w.domain && `Signed up with a school email (${w.domain})`,
  ].filter(Boolean);
  const who = whoLines.length ? whoLines.join("\n") : "They haven't told us much about themselves yet.";

  const t = u.person.timeline;
  const done = t.filter((x) => x.done).map((x) => x.name);
  const started = t.filter((x) => !x.done).map((x) => x.name);
  const journeyLines = [
    `Finished ${done.length} module${done.length === 1 ? "" : "s"}${done.length ? ": " + done.slice(0, 12).join(", ") : ""}.`,
    started.length ? `Started but didn't finish: ${started.slice(0, 8).join(", ")}.` : "",
    u.person.state.lastActiveDays == null ? "Has not been active yet." : `Last active ${u.person.state.lastActiveDays} days ago.`,
    `Worked alongside ${u.person.state.degree} peer${u.person.state.degree === 1 ? "" : "s"}.`,
  ].filter(Boolean);
  const journey = journeyLines.join("\n");
  const peers = u.person.peers.slice(0, 8).map((p) => p.name).join(", ");

  const pp = u.portrait || {};
  const portrait = [
    pp.summary, pp.context && `Context: ${pp.context}`, pp.reaching_for && `Reaching for: ${pp.reaching_for}`,
    pp.friction && `What's hard: ${pp.friction}`, pp.how_they_work && `How they work: ${pp.how_they_work}`,
    pp.where_headed && `Where headed: ${pp.where_headed}`,
  ].filter(Boolean).join("\n");

  return { who, journey, peers, work: u.work, portrait };
}

// A whole group, understood — for a roll-up at the viewer's level (a cohort for
// an instructor, programs for a program director, the school for a director).
export type RollupInputs = { scope: string; size: number; composition: string; engagement: string; standouts: string; os: CareOS };

export async function gatherRollup(admin: any, org: { id: string; name: string; owner_id?: string | null }, role: RoleInfo, userId: string): Promise<RollupInputs> {
  const os = await gatherCareOS(admin, org, role, userId);
  const scope = os.role === "director" ? org.name : os.role === "program_director" ? `${org.name} — your programs` : `${org.name} — your cohorts`;

  // Composition — who they said they are, from their own profiles.
  const ids = (os.memberIds || []).slice(0, 4000);
  const segCount: Record<string, number> = {};
  const goalCount: Record<string, number> = {};
  if (ids.length) {
    const { data: profs } = await admin.from("profiles").select("segment, goal").in("id", ids);
    for (const p of ((profs as any[]) || [])) {
      if (p.segment) segCount[p.segment] = (segCount[p.segment] || 0) + 1;
      if (p.goal) goalCount[p.goal] = (goalCount[p.goal] || 0) + 1;
    }
  }
  const segLine = Object.entries(segCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${SEGMENTS.find((s) => s.key === k)?.label || k}: ${v}`).join("; ") || "not specified";
  const goalLine = Object.entries(goalCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${GOALS.find((g) => g.key === k)?.label || k}: ${v}`).join("; ") || "not specified";
  const composition = `Who they said they are — ${segLine}.\nWhat they want — ${goalLine}.`;

  const engagement = [
    `${os.people} people; ${Math.round(os.coverage * 100)}% known by a human.`,
    `${os.orphaned.length} carried only by the system; ${os.needsPerson.length} slipping but carried.`,
    `${os.carers.length} carer(s) across ${os.programs.length} program(s); ${os.overloaded.length} beyond human scale.`,
  ].join("\n");

  const standouts = [
    ...os.needsPerson.slice(0, 5).map((p) => `${p.name} — ${p.bucket}, last: ${p.lastModule || "—"}`),
    ...os.helpfulPeers.slice(0, 3).map((p) => `${p.name} — helps ${p.peerDegree} peer(s)`),
  ].join("; ");

  return { scope, size: os.people, composition, engagement, standouts, os };
}
