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

// A BUNDLE is the unit that earns a credential: a coherent set of related
// modules, not a single exercise. Completion is CORE + ELECTIVES — every core
// module plus a choose-N-of-M elective set, like a concentration. The bundle
// name IS the postable certificate; individual completions are only progress
// toward one (and a transcript entry), never a standalone credential.
export type Bundle = {
  key: string;
  name: string; // the certificate name (postable on LinkedIn)
  line: string; // one-line capability it certifies
  core: string[]; // all required
  electives: string[]; // choose electivesNeeded of these
  electivesNeeded: number;
  skills: string[]; // professional skills the certificate demonstrates
  orgId?: string | null; // set = an org bundle; null/undefined = built-in or global
  id?: string; // DB id, for author-created bundles
};

export const BUNDLES: Bundle[] = [
  {
    key: "ai-ready",
    name: "AI-Augmented Work Redesign",
    line: "Redesigned real work around AI, end to end.",
    core: ["solo-ai", "workflow-solo"],
    electives: ["career-x-ray", "ai-canvas", "reimagine-job", "reimagine-workflow", "jd-x-ray"],
    electivesNeeded: 1,
    skills: ["AI Strategy", "Workflow Design", "Process Improvement", "Future of Work"],
  },
  {
    key: "strategist",
    name: "Business Strategy & Execution",
    line: "Pressure-tested a strategy from idea to a real test.",
    core: ["good-business", "execution-4a"],
    electives: ["test-the-bet", "opportunity-capability", "balanced-scorecard", "business-consult", "ai-board", "business-myopia"],
    electivesNeeded: 1,
    skills: ["Business Strategy", "Strategic Planning", "Execution", "Experimentation"],
  },
  {
    key: "negotiator",
    name: "Professional Negotiation",
    line: "Rehearsed and closed high-stakes negotiations.",
    core: ["close-the-offer", "name-your-price"],
    electives: ["ask-for-a-raise", "close-the-vendor-deal", "lease-the-space", "rehearse-hard-conversation"],
    electivesNeeded: 1,
    skills: ["Negotiation", "Persuasion", "Conflict Resolution", "Communication"],
  },
  {
    key: "career-navigator",
    name: "Career Strategy & Growth",
    line: "Mapped a career's AI exposure and the moves that follow.",
    core: ["career-x-ray", "career-roadmap"],
    electives: ["refresh-resume", "find-superpower", "personal-network", "career-myopia"],
    electivesNeeded: 1,
    skills: ["Career Development", "Strategic Planning", "Personal Branding"],
  },
  {
    key: "founder",
    name: "New Venture Development",
    line: "Took a venture from thesis to customer to price.",
    core: ["good-business", "customer-empathy"],
    electives: ["name-your-price", "deeptech-canvas", "test-the-bet", "define-vision"],
    electivesNeeded: 1,
    skills: ["Entrepreneurship", "Business Model Design", "Customer Discovery", "Pricing Strategy"],
  },
  {
    key: "research",
    name: "Social Science Research Foundations",
    line: "Framed, structured, argued, and modeled a research paper.",
    core: ["what-is-a-paper", "paper-structure", "read-the-interaction"],
    electives: ["making-points", "publication-pipeline", "understand-a-paper"],
    electivesNeeded: 1,
    skills: ["Academic Writing", "Research Design", "Scholarly Communication", "Scholarly Publishing"],
  },
];

export function bundleByKey(key: string, list: Bundle[] = BUNDLES): Bundle | undefined {
  return list.find((b) => b.key === key);
}
export function bundleSlugs(b: Bundle): string[] {
  return [...b.core, ...b.electives];
}

// ---- Author-created bundles (DB) ---------------------------------------------
// Built-in BUNDLES live in code; the `bundles` table holds ones created via UI.
// A row with org_id NULL is a global bundle (superadmin); org_id set is an org
// bundle (director), earned only by that org's members.

function rowToBundle(r: any): Bundle {
  return {
    key: r.key,
    name: r.name,
    line: r.line || "",
    core: Array.isArray(r.core) ? r.core : [],
    electives: Array.isArray(r.electives) ? r.electives : [],
    electivesNeeded: r.electives_needed || 0,
    skills: Array.isArray(r.skills) ? r.skills : [],
    orgId: r.org_id || null,
    id: r.id,
  };
}

/**
 * All bundles that apply to a user: the built-ins, all global DB bundles, and
 * the bundles of the orgs they belong to. Service-role client. Falls back to
 * the built-ins if the table isn't available.
 */
export async function loadBundles(admin: SB, opts: { orgIds?: string[] } = {}): Promise<Bundle[]> {
  const orgIds = opts.orgIds || [];
  try {
    const { data } = await admin.from("bundles").select("*").eq("active", true);
    const rows = ((data as any[]) || []).filter((r) => r.org_id === null || orgIds.includes(r.org_id));
    // Start from the code built-ins, then let DB rows OVERRIDE by key (so a
    // superadmin's edits to a default win) and ADD new keys.
    const map = new Map<string, Bundle>(BUNDLES.map((b) => [b.key, b]));
    for (const r of rows) {
      const b = rowToBundle(r);
      map.set(b.key, b);
    }
    return [...map.values()];
  } catch {
    return [...BUNDLES];
  }
}

// One bundle by key, DB first (so an edited default wins) then the code
// built-in. No org filter — the credential already proves it was earned.
export async function loadBundleByKey(admin: SB, key: string): Promise<Bundle | undefined> {
  try {
    const { data } = await admin.from("bundles").select("*").eq("key", key).maybeSingle();
    if (data) return rowToBundle(data);
  } catch {
    /* fall through to the code default */
  }
  return BUNDLES.find((b) => b.key === key);
}

// Seed the code built-ins into the table as editable global rows, once. Uses
// ignoreDuplicates so it never overwrites a superadmin's later edits. Call from
// the superadmin certificates page so the defaults show up as editable.
export async function seedBuiltinBundles(admin: SB): Promise<void> {
  const rows = BUNDLES.map((b) => ({
    key: b.key,
    name: b.name,
    line: b.line,
    core: b.core,
    electives: b.electives,
    electives_needed: b.electivesNeeded,
    skills: b.skills,
    org_id: null,
    active: true,
  }));
  await admin.from("bundles").upsert(rows, { onConflict: "key", ignoreDuplicates: true });
}

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
  "what-is-a-paper": { name: "Research Idea Articulation", skills: ["Research Design", "Scholarly Writing"] },
  "paper-structure": { name: "Academic Paper Structure", skills: ["Academic Writing", "Scholarly Communication"] },
  "making-points": { name: "Argument & Positioning", skills: ["Academic Writing", "Persuasive Communication"] },
  "read-the-interaction": { name: "Interaction Effects & Theory", skills: ["Econometrics", "Causal Reasoning", "Research Design"] },
  "publication-pipeline": { name: "Research Portfolio Strategy", skills: ["Scholarly Publishing", "Research Productivity"] },
  "understand-a-paper": { name: "Critical Reading of Research", skills: ["Literature Review", "Research Design", "Critical Analysis"] },
};

export function credentialName(slug: string): string {
  return CRED_META[slug]?.name || moduleBySlug(slug)?.name || "Superadditive Credential";
}
export function credentialSkills(slug: string): string[] {
  return CRED_META[slug]?.skills || [];
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

// ---- Transcript (the record of what you've done) -----------------------------

export type TranscriptItem = { slug: string; name: string; at: string };

// The full activity log, newest first. Not a credential — a record, and the
// raw material for bundle progress.
export function transcriptFrom(completed: { slug: string; at: string }[]): TranscriptItem[] {
  return completed
    .map((c) => (moduleBySlug(c.slug) ? { slug: c.slug, name: credentialName(c.slug), at: c.at } : null))
    .filter(Boolean)
    .sort((a, b) => ((a as TranscriptItem).at < (b as TranscriptItem).at ? 1 : -1)) as TranscriptItem[];
}

// ---- Bundles (the credential unit) -------------------------------------------

export type CurriculumItem = { slug: string; name: string; kind: "core" | "elective"; done: boolean; at?: string };
export type BundleView = {
  key: string;
  name: string;
  line: string;
  skills: string[];
  earned: boolean;
  coreDone: number;
  coreTotal: number;
  elecDone: number;
  elecNeeded: number;
  elecTotal: number;
  progressPct: number; // fraction of the requirement met, for a progress bar
  remaining: number; // modules still needed to earn it
  earnedAt?: string; // date the last required module completed
  items: CurriculumItem[];
  completedNames: string[]; // the modules actually completed (for the certificate)
};

export function bundlesFor(completed: { slug: string; at: string }[], list: Bundle[] = BUNDLES): BundleView[] {
  const at = new Map(completed.map((c) => [c.slug, c.at]));
  const done = new Set(completed.map((c) => c.slug));

  return list.map((b) => {
    const items: CurriculumItem[] = [
      ...b.core.map((s) => ({ slug: s, name: credentialName(s), kind: "core" as const, done: done.has(s), at: at.get(s) })),
      ...b.electives.map((s) => ({ slug: s, name: credentialName(s), kind: "elective" as const, done: done.has(s), at: at.get(s) })),
    ];
    const coreDone = b.core.filter((s) => done.has(s)).length;
    const elecDone = b.electives.filter((s) => done.has(s)).length;
    const earned = coreDone === b.core.length && elecDone >= b.electivesNeeded;

    const requirement = b.core.length + b.electivesNeeded;
    const met = coreDone + Math.min(elecDone, b.electivesNeeded);
    const completedItems = items.filter((i) => i.done);
    const earnedAt = earned
      ? completedItems.map((i) => i.at || "").filter(Boolean).sort().slice(-1)[0]
      : undefined;

    return {
      key: b.key,
      name: b.name,
      line: b.line,
      skills: b.skills,
      earned,
      coreDone,
      coreTotal: b.core.length,
      elecDone,
      elecNeeded: b.electivesNeeded,
      elecTotal: b.electives.length,
      progressPct: Math.round((met / requirement) * 100),
      remaining: Math.max(0, requirement - met),
      earnedAt,
      items,
      completedNames: completedItems.map((i) => i.name),
    };
  });
}

// The bundles a given module contributes to (for the completion-moment nudge).
export function bundlesForSlug(slug: string, list: Bundle[] = BUNDLES): Bundle[] {
  return list.filter((b) => b.core.includes(slug) || b.electives.includes(slug));
}

// ---- Materialization (stable ids for verify pages) ---------------------------

export type CredRow = {
  id: string;
  kind: string; // "track" = a bundle certificate (the only kind minted now)
  ckey: string;
  title: string;
  earned_at: string;
};

/**
 * Idempotently persist EARNED bundle certificates so each has a stable id
 * backing a /c/<id> verify page. Only bundles are minted — individual module
 * completions are progress, not credentials. Uses the service-role admin client
 * (server only). Returns every credential row for the user, keyed "kind:ckey".
 */
export async function materializeBundles(
  admin: SB,
  userId: string,
  bundles: BundleView[],
): Promise<Map<string, CredRow>> {
  const rows = bundles
    .filter((b) => b.earned)
    .map((b) => ({ user_id: userId, kind: "track", ckey: b.key, title: b.name, earned_at: b.earnedAt || undefined }));

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
  title: string;
  line: string; // capability description
  eyebrow: string; // "CERTIFICATE"
  skills: string[]; // professional skills it demonstrates
  contents?: { name: string }[]; // the curriculum (overridden per-user on the verify page)
};

// Describe a stored bundle certificate for rendering. Pass the loaded `bundle`
// (built-in or DB); falls back to built-ins by key. The verify page overrides
// `contents` with the modules the holder actually completed.
export function describeCredential(ckey: string, title: string, bundle?: Bundle): CredentialView {
  const b = bundle || bundleByKey(ckey);
  return {
    title: b?.name || title,
    line: b?.line || "A completed Superadditive program.",
    eyebrow: "CERTIFICATE",
    skills: b?.skills || [],
    contents: b ? bundleSlugs(b).map((s) => ({ name: credentialName(s) })) : undefined,
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
