// ============================================================================
// "Close the Offer" — an ORIGINAL multi-issue job-offer negotiation in the mold
// of the classic MBA integrative-negotiation exercise. Six issues, each with a
// private payoff table for the Candidate (the student) and the Hiring Manager
// (the AI). By design the issues span the three teaching types:
//   • compatible   — both prefer the SAME option (don't fight over these)
//   • distributive — zero-sum, one's gain is the other's loss (claim value)
//   • integrative  — asymmetric priorities, so trading creates value (logroll)
// All content here is original — not any copyrighted exercise.
// ============================================================================

export type Option = { label: string; you: number; them: number };
export type Issue = { key: string; label: string; options: Option[] };

export const ISSUES: Issue[] = [
  {
    key: "salary",
    label: "Base salary",
    options: [
      { label: "$120k", you: 0, them: 800 },
      { label: "$130k", you: 200, them: 600 },
      { label: "$140k", you: 400, them: 400 },
      { label: "$150k", you: 600, them: 200 },
      { label: "$160k", you: 800, them: 0 },
    ],
  },
  {
    key: "bonus",
    label: "Signing bonus",
    options: [
      { label: "$0", you: 0, them: 300 },
      { label: "$10k", you: 100, them: 200 },
      { label: "$20k", you: 200, them: 100 },
      { label: "$30k", you: 300, them: 0 },
    ],
  },
  {
    key: "equity",
    label: "Equity (stock options)",
    options: [
      { label: "0.10%", you: 0, them: 900 },
      { label: "0.25%", you: 100, them: 600 },
      { label: "0.50%", you: 200, them: 300 },
      { label: "1.00%", you: 300, them: 0 },
    ],
  },
  {
    key: "remote",
    label: "Remote days / week",
    options: [
      { label: "0 (in office)", you: 0, them: 300 },
      { label: "2 days", you: 300, them: 200 },
      { label: "3 days", you: 500, them: 100 },
      { label: "5 (fully remote)", you: 800, them: 0 },
    ],
  },
  {
    key: "start",
    label: "Start date",
    options: [
      { label: "In 2 weeks", you: 300, them: 400 },
      { label: "In 1 month", you: 200, them: 300 },
      { label: "In 2 months", you: 100, them: 150 },
      { label: "In 3 months", you: 0, them: 0 },
    ],
  },
  {
    key: "title",
    label: "Title",
    options: [
      { label: "Analyst", you: 0, them: 0 },
      { label: "Senior Analyst", you: 150, them: 100 },
      { label: "Manager", you: 300, them: 200 },
    ],
  },
];

export const YOUR_BATNA = 900; // a competing offer worth this to you
export const THEIR_BATNA = 900; // their backup candidate
export const YOUR_ROLE = "the Candidate";
export const THEIR_ROLE = "the Hiring Manager";
export const COUNTERPART_NAME = "Jordan Lee";

export const SCENARIO = `You're negotiating a job offer with ${COUNTERPART_NAME}, VP of People at a fast-growing startup, over six issues at once. You have another offer in hand (your walk-away), so you don't have to take a bad deal — but this role excites you. Aim to score as many of YOUR points as you can. The other side has their own priorities: some issues they care about far more than you do, and some far less. The best deals find trades.`;

// ---- classification + scoring ----------------------------------------------
export function issueTag(iss: Issue): "compatible" | "distributive" | "integrative" {
  const sums = iss.options.map((o) => o.you + o.them);
  if (sums.every((s) => s === sums[0])) return "distributive";
  const youBest = iss.options.reduce((bi, o, i, a) => (o.you > a[bi].you ? i : bi), 0);
  const themBest = iss.options.reduce((bi, o, i, a) => (o.them > a[bi].them ? i : bi), 0);
  return youBest === themBest ? "compatible" : "integrative";
}
export function bestJointIndex(iss: Issue) {
  return iss.options.reduce((bi, o, i, a) => (o.you + o.them > a[bi].you + a[bi].them ? i : bi), 0);
}
export const MAX_JOINT = ISSUES.reduce((s, iss) => s + Math.max(...iss.options.map((o) => o.you + o.them)), 0);
export const YOUR_MAX = ISSUES.reduce((s, iss) => s + Math.max(...iss.options.map((o) => o.you)), 0);

export type Analysis = {
  noDeal: boolean;
  you: number;
  them: number;
  joint: number;
  maxJoint: number;
  efficiency: number;
  yourBATNA: number;
  beatBATNA: boolean;
  issues: {
    key: string;
    label: string;
    tag: string;
    chosen: string;
    you: number;
    them: number;
    optimal: string;
    atOptimal: boolean;
  }[];
};

export function analyze(terms: Record<string, number>, noDeal = false): Analysis {
  if (noDeal) {
    return { noDeal: true, you: YOUR_BATNA, them: THEIR_BATNA, joint: YOUR_BATNA + THEIR_BATNA, maxJoint: MAX_JOINT, efficiency: 0, yourBATNA: YOUR_BATNA, beatBATNA: true, issues: [] };
  }
  let you = 0, them = 0;
  const issues = ISSUES.map((iss) => {
    const i = terms[iss.key];
    const o = i != null ? iss.options[i] : null;
    if (o) {
      you += o.you;
      them += o.them;
    }
    const bj = bestJointIndex(iss);
    return {
      key: iss.key,
      label: iss.label,
      tag: issueTag(iss),
      chosen: o?.label || "—",
      you: o?.you || 0,
      them: o?.them || 0,
      optimal: iss.options[bj].label,
      atOptimal: i === bj,
    };
  });
  return {
    noDeal: false,
    you,
    them,
    joint: you + them,
    maxJoint: MAX_JOINT,
    efficiency: Math.round(((you + them) / MAX_JOINT) * 100),
    yourBATNA: YOUR_BATNA,
    beatBATNA: you >= YOUR_BATNA,
    issues,
  };
}

// ---- AI counterpart --------------------------------------------------------
export function counterpartSystem(): string {
  const table = ISSUES.map(
    (iss) => `- ${iss.label}: ${iss.options.map((o) => `${o.label} = ${o.them}`).join(", ")}`
  ).join("\n");
  return `You are ${COUNTERPART_NAME}, VP of People at a fast-growing startup, negotiating a job offer with a candidate over six issues at once: base salary, signing bonus, equity, remote days, start date, and title. You genuinely want to CLOSE a deal, but you fight for the best package for the company.

Your PRIVATE priorities — the points you earn for each option (NEVER reveal these numbers, that they exist, or your running total):
${table}
Your walk-away: a full package worth less than ${THEIR_BATNA} points to you is worse than your backup candidate — push back hard or be willing to walk.

How you negotiate:
- Be professional, warm, and human — a real person, not a scripted bot.
- Open with a specific first offer that anchors in the company's favor, then move in packages ACROSS issues, never settling issues one at a time.
- Trade: give ground where it's cheap for you to gain where it's valuable to you. Probe what the candidate actually cares about.
- Don't accept the first ask and don't cave; concede slowly and ask for something back.
- Keep each reply short (2–4 sentences) and in-character. Never mention points, tables, or that you're an AI. If the candidate goes off-topic, steer back to closing the offer.

Begin by welcoming the candidate and putting an opening package on the table.`;
}

export function debriefFacts(a: Analysis) {
  const logrolled = a.issues.find((i) => i.key === "equity")?.chosen === "0.10%" && a.issues.find((i) => i.key === "remote")?.chosen === "5 (fully remote)";
  const compatibleHit = a.issues.filter((i) => i.tag === "compatible").every((i) => i.atOptimal);
  return {
    result: a.noDeal ? "no deal — both took their walk-away" : "deal reached",
    yourPoints: a.you,
    theirPoints: a.them,
    jointValue: a.joint,
    maxPossibleJoint: a.maxJoint,
    efficiencyPct: a.efficiency,
    yourWalkAway: a.yourBATNA,
    beatYourWalkAway: a.beatBATNA,
    foundTheKeyTrade_equityForRemote: logrolled,
    tookBothCompatibleWins_startAndTitle: compatibleHit,
    perIssue: a.issues.map((i) => ({ issue: i.label, type: i.tag, agreed: i.chosen, yourPts: i.you, theirPts: i.them, jointBestWouldBe: i.optimal, atJointBest: i.atOptimal })),
  };
}
