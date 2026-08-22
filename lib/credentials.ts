import { MODULES, moduleBySlug } from "@/lib/modules";
import { BRAND } from "@/lib/brand";

// ============================================================================
// Credentials + levels. A credential is EARNED, not given: an "exercise"
// credential is one completed exercise; a "track" certificate is a themed set
// finished in full. Both are derived from real completions, then materialized
// into the `credentials` table so each gets a stable id and a public verify
// page at /c/<id>. Levels are an overall status derived from how many
// exercises someone has finished. Tone: modern / minimal, distinguished.
// ============================================================================

export type Track = {
  key: string;
  name: string; // the credential name (postable on LinkedIn)
  line: string; // one-line capability it represents
  slugs: string[]; // the module slugs that make up the track (all required)
  skills: string[]; // professional skills the certificate demonstrates
};

// Each track is a small, real accomplishment: three core exercises, all
// required, so the certificate stays distinguished rather than a click-badge.
// Names are professional and resume-grade, not playful.
export const TRACKS: Track[] = [
  {
    key: "ai-ready",
    name: "AI-Augmented Work Redesign",
    line: "Redesigned real work around AI, end to end.",
    slugs: ["solo-ai", "workflow-solo", "career-x-ray"],
    skills: ["AI Strategy", "Workflow Design", "Process Improvement", "Future of Work"],
  },
  {
    key: "strategist",
    name: "Business Strategy & Execution",
    line: "Pressure-tested a strategy from idea to a real test.",
    slugs: ["good-business", "execution-4a", "test-the-bet"],
    skills: ["Business Strategy", "Strategic Planning", "Execution", "Experimentation"],
  },
  {
    key: "negotiator",
    name: "Professional Negotiation",
    line: "Rehearsed and closed high-stakes negotiations.",
    slugs: ["close-the-offer", "name-your-price", "rehearse-hard-conversation"],
    skills: ["Negotiation", "Persuasion", "Conflict Resolution", "Communication"],
  },
  {
    key: "career-navigator",
    name: "Career Strategy & Planning",
    line: "Mapped a career's AI exposure and the moves that follow.",
    slugs: ["career-x-ray", "career-roadmap", "refresh-resume"],
    skills: ["Career Development", "Strategic Planning", "Personal Branding"],
  },
  {
    key: "founder",
    name: "New Venture Development",
    line: "Took a venture from thesis to customer to price.",
    slugs: ["good-business", "customer-empathy", "name-your-price"],
    skills: ["Entrepreneurship", "Business Model Design", "Customer Discovery", "Pricing Strategy"],
  },
];

// Serious, accurate credential names + the skills each demonstrates. The module
// names are imperative task labels ("Negotiate a Job Offer"); a credential wants
// a professional noun phrase ("Job Offer Negotiation"). Falls back to the module
// name for anything unmapped.
type CredMeta = { name: string; skills: string[] };
const CRED_META: Record<string, CredMeta> = {
  "reimagine-job": { name: "Job Redesign with AI", skills: ["AI Strategy", "Job Design", "Workflow Design"] },
  "reimagine-workflow": { name: "Workflow Redesign with AI", skills: ["AI Strategy", "Process Improvement", "Workflow Design"] },
  "benchmark": { name: "Human–AI Reasoning Benchmark", skills: ["AI Literacy", "Critical Thinking"] },
  "workflow-solo": { name: "AI Workflow Redesign", skills: ["Process Improvement", "Automation Strategy", "AI Adoption"] },
  "jd-x-ray": { name: "Role AI Exposure Analysis", skills: ["AI Impact Analysis", "Workforce Planning"] },
  "career-x-ray": { name: "Career AI Exposure Analysis", skills: ["AI Impact Analysis", "Career Planning"] },
  "vendor-disclosure": { name: "AI Vendor Due Diligence", skills: ["Vendor Risk Management", "AI Governance"] },
  "haip-disclosure": { name: "Healthcare AI Vendor Due Diligence", skills: ["AI Governance", "Healthcare Compliance"] },
  "career-roadmap": { name: "Career Strategy & Roadmapping", skills: ["Career Planning", "Professional Development"] },
  "solo-ai": { name: "AI Work Redesign", skills: ["AI Strategy", "Job Design", "Productivity"] },
  "execution-4a": { name: "Strategic Execution Assessment", skills: ["Strategic Planning", "Execution", "Operational Excellence"] },
  "close-the-offer": { name: "Job Offer Negotiation", skills: ["Negotiation", "Compensation Strategy"] },
  "name-your-price": { name: "Pricing Negotiation", skills: ["Negotiation", "Pricing Strategy"] },
  "ask-for-a-raise": { name: "Compensation Negotiation", skills: ["Negotiation", "Self-Advocacy"] },
  "close-the-vendor-deal": { name: "Vendor Negotiation", skills: ["Negotiation", "Procurement"] },
  "lease-the-space": { name: "Commercial Lease Negotiation", skills: ["Negotiation", "Commercial Real Estate"] },
  "rehearse-hard-conversation": { name: "Difficult Conversations", skills: ["Communication", "Conflict Resolution", "Leadership"] },
  "define-vision": { name: "Company Vision Development", skills: ["Vision & Strategy", "Leadership"] },
  "define-vision-voice": { name: "Company Vision Development", skills: ["Vision & Strategy", "Leadership"] },
  "good-business": { name: "Business Model Validation", skills: ["Business Strategy", "Market Analysis", "Entrepreneurship"] },
  "balanced-scorecard": { name: "Balanced Scorecard Design", skills: ["Strategic Planning", "Performance Management"] },
  "deeptech-canvas": { name: "Deep-Tech Venture Planning", skills: ["Entrepreneurship", "Technology Strategy"] },
  "ai-canvas": { name: "AI Opportunity Mapping", skills: ["AI Strategy", "Process Analysis"] },
  "opportunity-capability": { name: "Strategic Opportunity Assessment", skills: ["Strategic Planning", "Decision Analysis"] },
  "test-the-bet": { name: "Strategic Experiment Design", skills: ["Experimentation", "Strategic Planning", "Validation"] },
  "business-consult": { name: "Business Diagnostics", skills: ["Business Analysis", "Strategy", "Diagnostics"] },
  "find-superpower": { name: "Professional Strengths Assessment", skills: ["Self-Awareness", "Professional Development"] },
  "ai-board": { name: "AI-Assisted Decision Making", skills: ["Decision Making", "AI Strategy"] },
  "voice-consult": { name: "Business Diagnostics", skills: ["Business Analysis", "Strategy", "Diagnostics"] },
  "customer-empathy": { name: "Customer Discovery", skills: ["Customer Research", "Product Strategy"] },
  "refresh-resume": { name: "Résumé Development", skills: ["Career Development", "Personal Branding"] },
  "refresh-resume-voice": { name: "Résumé Development", skills: ["Career Development", "Personal Branding"] },
  "business-myopia": { name: "Business Blind-Spot Analysis", skills: ["Strategic Thinking", "Risk Analysis"] },
  "career-myopia": { name: "Career Blind-Spot Analysis", skills: ["Career Planning", "Self-Assessment"] },
  "personal-network": { name: "Professional Network Analysis", skills: ["Networking", "Relationship Building"] },
  "domain-brief": { name: "Domain Expertise Brief", skills: ["Research", "Domain Analysis"] },
  "find-collaborators": { name: "Collaborator Identification", skills: ["Networking", "Partnership Development"] },
  "licensing-brief": { name: "Technology Licensing Analysis", skills: ["IP Strategy", "Licensing"] },
};

export function credentialName(slug: string): string {
  return CRED_META[slug]?.name || moduleBySlug(slug)?.name || "Superadditive Credential";
}
export function credentialSkills(slug: string): string[] {
  return CRED_META[slug]?.skills || [];
}

export function trackByKey(key: string): Track | undefined {
  return TRACKS.find((t) => t.key === key);
}

// Overall status ladder, keyed on number of exercises completed. Kept distinct
// from track names so the two never collide.
export const LEVELS: { min: number; title: string }[] = [
  { min: 1, title: "Explorer" },
  { min: 3, title: "Practitioner" },
  { min: 6, title: "Operator" },
  { min: 10, title: "Master" },
];

export type LevelState = {
  title: string | null; // null before the first completion
  index: number; // -1 before first level
  next: { title: string; need: number } | null; // remaining to next level
};

export function levelFor(count: number): LevelState {
  let index = -1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (count >= LEVELS[i].min) index = i;
  }
  const title = index >= 0 ? LEVELS[index].title : null;
  const nextDef = LEVELS[index + 1];
  const next = nextDef ? { title: nextDef.title, need: nextDef.min - count } : null;
  return { title, index, next };
}

// ---- Completion enumeration ---------------------------------------------------

type SB = {
  from: (t: string) => any;
};

/**
 * Which exercises has this user COMPLETED? Completion = a `done` session for the
 * module's exercise (plus the two exercises that live in their own tables).
 * Group modules produce no personal artifact and are excluded. Returns slugs
 * with the completion date, for the credential's earned_at.
 */
export async function completedSlugs(
  supabase: SB,
  userId: string,
): Promise<{ slug: string; at: string }[]> {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("exercise,status,created_at")
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .limit(600);

  // exercise -> earliest completion date
  const doneAt = new Map<string, string>();
  for (const s of (sessions as any[]) || []) {
    if (s.status !== "done") continue;
    const prev = doneAt.get(s.exercise);
    if (!prev || (s.created_at && s.created_at < prev)) doneAt.set(s.exercise, s.created_at);
  }

  // Two exercises complete via their own tables, not a `done` session.
  const [{ data: bench }, { data: net }] = await Promise.all([
    supabase.from("benchmark_results").select("created_at").eq("user_id", userId).limit(1),
    supabase.from("network_responses").select("updated_at").eq("user_id", userId).limit(1),
  ]);
  if (bench && bench.length) doneAt.set("benchmark", (bench[0] as any).created_at || nowIso(doneAt));
  if (net && net.length) doneAt.set("network", (net[0] as any).updated_at || nowIso(doneAt));

  const out: { slug: string; at: string }[] = [];
  for (const m of MODULES) {
    if (m.partner === "group") continue;
    const at = doneAt.get(m.exercise);
    if (at) out.push({ slug: m.slug, at });
  }
  return out;
}

// Avoid Date.now() churn; fall back to any known completion date if a special
// table row lacks its own timestamp.
function nowIso(doneAt: Map<string, string>): string {
  for (const v of doneAt.values()) return v;
  return "";
}

// ---- Earned credentials (derived) --------------------------------------------

export type EarnedExercise = { slug: string; name: string; line: string; at: string };
export type EarnedTrack = { key: string; name: string; line: string; at: string };

export type Earned = {
  count: number;
  exercises: EarnedExercise[];
  tracks: EarnedTrack[];
  level: LevelState;
};

export function earnedFrom(completed: { slug: string; at: string }[]): Earned {
  const atBySlug = new Map(completed.map((c) => [c.slug, c.at]));

  const exercises: EarnedExercise[] = completed
    .map((c) => {
      const m = moduleBySlug(c.slug);
      if (!m) return null;
      return { slug: c.slug, name: credentialName(c.slug), line: m.tagline, at: c.at };
    })
    .filter(Boolean) as EarnedExercise[];
  exercises.sort((a, b) => (a.at < b.at ? 1 : -1)); // newest first

  const tracks: EarnedTrack[] = TRACKS.filter((t) => t.slugs.every((s) => atBySlug.has(s))).map(
    (t) => {
      // earned when the LAST of its exercises was completed
      const at = t.slugs.map((s) => atBySlug.get(s)!).sort().slice(-1)[0] || "";
      return { key: t.key, name: t.name, line: t.line, at };
    },
  );

  return {
    count: exercises.length,
    exercises,
    tracks,
    level: levelFor(exercises.length),
  };
}

// ---- Materialization (stable ids for verify pages) ---------------------------

export type CredRow = {
  id: string;
  kind: "exercise" | "track";
  ckey: string;
  title: string;
  earned_at: string;
};

/**
 * Idempotently persist earned credentials so each has a stable id backing a
 * /c/<id> verify page. Uses the service-role admin client (server only).
 * Returns every credential row for the user, keyed "kind:ckey" -> row.
 */
export async function materializeCredentials(
  admin: SB,
  userId: string,
  earned: Earned,
): Promise<Map<string, CredRow>> {
  const rows = [
    ...earned.exercises.map((e) => ({
      user_id: userId,
      kind: "exercise",
      ckey: e.slug,
      title: e.name,
      earned_at: e.at || undefined,
    })),
    ...earned.tracks.map((t) => ({
      user_id: userId,
      kind: "track",
      ckey: t.key,
      title: t.name,
      earned_at: t.at || undefined,
    })),
  ];

  if (rows.length) {
    // ignoreDuplicates keeps the original earned_at stable across visits.
    await admin
      .from("credentials")
      .upsert(rows, { onConflict: "user_id,kind,ckey", ignoreDuplicates: true });
  }

  const { data } = await admin
    .from("credentials")
    .select("id,kind,ckey,title,earned_at")
    .eq("user_id", userId);

  const map = new Map<string, CredRow>();
  for (const r of (data as CredRow[]) || []) map.set(`${r.kind}:${r.ckey}`, r);
  return map;
}

// ---- Verify-page describe + LinkedIn deep link -------------------------------

export type CredentialView = {
  kind: "exercise" | "track";
  title: string;
  line: string; // capability description
  eyebrow: string; // "CREDENTIAL" | "CERTIFICATE"
  skills: string[]; // professional skills it demonstrates
  contents?: { name: string }[]; // for tracks: what it comprises
};

// Describe a stored credential from its kind + key, for rendering.
export function describeCredential(kind: string, ckey: string, title: string): CredentialView {
  if (kind === "track") {
    const t = trackByKey(ckey);
    return {
      kind: "track",
      title: t?.name || title,
      line: t?.line || "A completed Superadditive track.",
      eyebrow: "CERTIFICATE",
      skills: t?.skills || [],
      contents: (t?.slugs || [])
        .map((s) => moduleBySlug(s))
        .filter(Boolean)
        .map((m) => ({ name: credentialName((m as any).slug) })),
    };
  }
  const m = moduleBySlug(ckey);
  return {
    kind: "exercise",
    title: credentialName(ckey),
    line: m?.tagline || "A completed Superadditive exercise.",
    eyebrow: "CREDENTIAL",
    skills: credentialSkills(ckey),
  };
}

// LinkedIn's "Add to profile" prefilled certification form. One click adds the
// credential to the member's Licenses & certifications, linking back to the
// verify page — the growth loop.
export function linkedInAddUrl(opts: {
  name: string;
  certUrl: string;
  certId: string;
  year?: number;
  month?: number;
}): string {
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: opts.name,
    organizationName: BRAND.name,
    certUrl: opts.certUrl,
    certId: opts.certId,
  });
  if (opts.year) p.set("issueYear", String(opts.year));
  if (opts.month) p.set("issueMonth", String(opts.month));
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}
