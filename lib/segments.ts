// ============================================================================
// Audience segmentation — who the user is, what they want, and which modules
// to surface for them. Drives onboarding + the dashboard's "Recommended for
// you" section. Segment/goal live on profiles; recommendations are derived.
// ============================================================================

export type SegmentKey =
  | "employee"
  | "undergrad"
  | "grad"
  | "researcher"
  | "highschool"
  | "founder_curious"
  | "smb"
  | "manager"
  | "early_career"
  | "learner";

export type FollowupKind = "teamSize" | "founderStage" | "study" | null;

export const SEGMENTS: {
  key: SegmentKey;
  label: string;
  emoji: string;
  followup: FollowupKind;
}[] = [
  { key: "employee", label: "I'm an employee at a company", emoji: "🏢", followup: null },
  { key: "manager", label: "I'm a manager", emoji: "🧑‍💼", followup: "teamSize" },
  { key: "early_career", label: "I'm just starting my career", emoji: "🌱", followup: null },
  { key: "grad", label: "I'm an MBA or master's student", emoji: "🎓", followup: "study" },
  { key: "undergrad", label: "I'm an undergraduate", emoji: "📚", followup: "study" },
  { key: "highschool", label: "I'm a high school student", emoji: "🎒", followup: "study" },
  { key: "researcher", label: "I'm a scientist or researcher", emoji: "🔬", followup: null },
  { key: "founder_curious", label: "I'm thinking of starting a business", emoji: "💡", followup: "founderStage" },
  { key: "smb", label: "I run a small business", emoji: "🏪", followup: "teamSize" },
  { key: "learner", label: "I just want to learn about business & decision-making", emoji: "🧠", followup: null },
];

export type GoalKey =
  | "redesign_job"
  | "team"
  | "business_idea"
  | "negotiation"
  | "career"
  | "explore";

export const GOALS: { key: GoalKey; label: string; emoji: string }[] = [
  { key: "redesign_job", label: "Redesign my own job around AI", emoji: "🧭" },
  { key: "team", label: "Rethink how my team or workflows run", emoji: "🔧" },
  { key: "business_idea", label: "Pressure-test a business idea", emoji: "🚀" },
  { key: "negotiation", label: "Get sharper at negotiation", emoji: "🤝" },
  { key: "career", label: "See my career's AI exposure", emoji: "🩻" },
  { key: "explore", label: "Just explore and learn", emoji: "✨" },
];

export const TEAM_SIZES = ["Just me", "2–10", "11–50", "50+"];
export const FOUNDER_STAGES = ["Just an idea", "Building it", "Already launched"];

// Which modules to prioritize, by segment (ordered, best first).
const SEGMENT_MODULES: Record<SegmentKey, string[]> = {
  employee: ["career-roadmap", "solo-ai", "career-x-ray", "close-the-offer", "workflow-solo"],
  undergrad: ["career-x-ray", "career-roadmap", "close-the-offer", "benchmark", "good-business"],
  grad: ["good-business", "execution-4a", "balanced-scorecard", "ai-canvas", "opportunity-capability", "test-the-bet", "close-the-offer", "career-roadmap"],
  researcher: ["workflow-solo", "ai-canvas", "good-business", "test-the-bet"],
  highschool: ["benchmark", "career-x-ray", "good-business"],
  founder_curious: ["good-business", "test-the-bet", "ai-canvas", "name-your-price", "close-the-offer"],
  smb: ["good-business", "execution-4a", "balanced-scorecard", "workflow-solo", "opportunity-capability"],
  manager: ["execution-4a", "balanced-scorecard", "opportunity-capability", "workflow-solo", "reimagine-workflow", "close-the-offer"],
  early_career: ["career-roadmap", "career-x-ray", "solo-ai", "close-the-offer", "benchmark"],
  learner: ["benchmark", "good-business", "solo-ai", "career-x-ray"],
};

// Which modules to prioritize, by stated goal (weighted ahead of segment).
const GOAL_MODULES: Record<GoalKey, string[]> = {
  redesign_job: ["solo-ai", "reimagine-job", "workflow-solo", "career-x-ray"],
  team: ["reimagine-workflow", "workflow-solo", "execution-4a", "balanced-scorecard", "opportunity-capability"],
  business_idea: ["good-business", "test-the-bet", "ai-canvas", "name-your-price"],
  negotiation: ["close-the-offer", "name-your-price"],
  career: ["career-roadmap", "career-x-ray", "solo-ai", "jd-x-ray"],
  explore: ["benchmark", "good-business", "solo-ai"],
};

// Recommended module slugs for a profile: goal picks first, then segment,
// deduped in order. `valid` is the set of slugs that actually exist/are shown.
export function recommendedSlugs(
  opts: { segment?: string | null; goal?: string | null },
  valid: Set<string>,
  limit = 6
): string[] {
  const out: string[] = [];
  const push = (slug: string) => {
    if (valid.has(slug) && !out.includes(slug)) out.push(slug);
  };
  const g = GOAL_MODULES[opts.goal as GoalKey];
  const s = SEGMENT_MODULES[opts.segment as SegmentKey];
  if (g) g.forEach(push);
  if (s) s.forEach(push);
  return out.slice(0, limit);
}

// Passive signal: classify the sign-up email domain without asking anything.
const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com",
  "hotmail.com", "live.com", "icloud.com", "me.com", "mac.com", "aol.com",
  "proton.me", "protonmail.com", "gmx.com", "mail.com", "msn.com", "yandex.com",
  "qq.com", "163.com", "126.com", "foxmail.com",
]);

export function classifyEmail(email?: string | null): {
  type: "personal" | "education" | "corporate" | "unknown";
  domain: string;
} {
  const domain = (email || "").split("@")[1]?.toLowerCase().trim() || "";
  if (!domain) return { type: "unknown", domain: "" };
  if (/\.edu$/.test(domain) || /\.edu\.[a-z]{2}$/.test(domain) || /(^|\.)ac\.[a-z]{2}$/.test(domain))
    return { type: "education", domain };
  if (PERSONAL_DOMAINS.has(domain)) return { type: "personal", domain };
  return { type: "corporate", domain };
}
