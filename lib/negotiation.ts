// ============================================================================
// Negotiation scenarios — all ORIGINAL content, built in the pedagogical mold
// of classic MBA negotiation exercises (not any copyrighted case).
//   • "offer"  — multi-issue integrative bargaining (compatible / distributive /
//                integrative issues, private payoff tables). Teaches value
//                CREATION (logrolling) + claiming.
//   • "haggle" — single-issue distributive price negotiation with reservation
//                prices and a ZOPA. Teaches anchoring, BATNA, claiming.
// ============================================================================

export type Option = { label: string; you: number; them: number };
export type Issue = { key: string; label: string; options: Option[] };

type Common = {
  slug: string;
  exercise: string;
  name: string;
  counterpartName: string;
  youRole: string;
  themRole: string;
  scenario: string;
};
export type MultiScenario = Common & {
  kind: "multi-issue";
  issues: Issue[];
  yourBatna: number;
};
export type PriceScenario = Common & {
  kind: "single-price";
  role: "buyer" | "seller"; // the student's side
  yourReservation: number; // student's walk-away price
  theirReservation: number; // AI's walk-away price (private)
  listPrice: number; // the visible anchor
  unit: string; // "$"
  item: string; // "the van"
};
export type Scenario = MultiScenario | PriceScenario;

// ---------------------------------------------------------------------------
// Scenario 1 — "Close the Offer" (multi-issue integrative)
// ---------------------------------------------------------------------------
const OFFER: MultiScenario = {
  kind: "multi-issue",
  slug: "close-the-offer",
  exercise: "negotiation",
  name: "Close the Offer",
  counterpartName: "Jordan Lee",
  youRole: "the Candidate",
  themRole: "the Hiring Manager",
  yourBatna: 900,
  scenario:
    "You're negotiating a job offer with Jordan Lee, VP of People at a fast-growing startup, over six issues at once. You have another offer in hand (your walk-away), so you don't have to take a bad deal, but this role excites you. Aim to score as many of YOUR points as you can. The other side has their own priorities: some issues they care about far more than you do, and some far less. The best deals find trades.",
  issues: [
    { key: "salary", label: "Base salary", options: [
      { label: "$120k", you: 0, them: 800 }, { label: "$130k", you: 200, them: 600 }, { label: "$140k", you: 400, them: 400 }, { label: "$150k", you: 600, them: 200 }, { label: "$160k", you: 800, them: 0 },
    ] },
    { key: "bonus", label: "Signing bonus", options: [
      { label: "$0", you: 0, them: 300 }, { label: "$10k", you: 100, them: 200 }, { label: "$20k", you: 200, them: 100 }, { label: "$30k", you: 300, them: 0 },
    ] },
    { key: "equity", label: "Equity (stock options)", options: [
      { label: "0.10%", you: 0, them: 900 }, { label: "0.25%", you: 100, them: 600 }, { label: "0.50%", you: 200, them: 300 }, { label: "1.00%", you: 300, them: 0 },
    ] },
    { key: "remote", label: "Remote days / week", options: [
      { label: "0 (in office)", you: 0, them: 300 }, { label: "2 days", you: 300, them: 200 }, { label: "3 days", you: 500, them: 100 }, { label: "5 (fully remote)", you: 800, them: 0 },
    ] },
    { key: "start", label: "Start date", options: [
      { label: "In 2 weeks", you: 300, them: 400 }, { label: "In 1 month", you: 200, them: 300 }, { label: "In 2 months", you: 100, them: 150 }, { label: "In 3 months", you: 0, them: 0 },
    ] },
    { key: "title", label: "Title", options: [
      { label: "Analyst", you: 0, them: 0 }, { label: "Senior Analyst", you: 150, them: 100 }, { label: "Manager", you: 300, them: 200 },
    ] },
  ],
};

// ---------------------------------------------------------------------------
// Scenario 2 — "Name Your Price" (single-issue distributive)
// ---------------------------------------------------------------------------
const HAGGLE: PriceScenario = {
  kind: "single-price",
  slug: "name-your-price",
  exercise: "haggle",
  name: "Name Your Price",
  counterpartName: "Sam Rivera",
  youRole: "the Buyer",
  themRole: "the Seller",
  role: "buyer",
  yourReservation: 16000, // you won't pay more than this (a dealer van is your backup)
  theirReservation: 12500, // Sam won't take less (private)
  listPrice: 17500,
  unit: "$",
  item: "the van",
  scenario:
    "You're buying a lightly-used cargo van for your growing delivery business from a private seller, Sam Rivera. You've done your homework: comparable vans go for about $15–16k, and a dealer has one you could take for $16,000, so you will NOT pay more than that here. Sam has the van listed at $17,500. It comes down to one number: agree on a price, or walk. Anchor well, know your walk-away, and claim as much of the gap as you can.",
};

export const SCENARIOS: Scenario[] = [OFFER, HAGGLE];
export function scenarioByExercise(ex: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.exercise === ex);
}

// ---- multi-issue helpers ----------------------------------------------------
export function issueTag(iss: Issue): "compatible" | "distributive" | "integrative" {
  const sums = iss.options.map((o) => o.you + o.them);
  if (sums.every((s) => s === sums[0])) return "distributive";
  const yb = iss.options.reduce((bi, o, i, a) => (o.you > a[bi].you ? i : bi), 0);
  const tb = iss.options.reduce((bi, o, i, a) => (o.them > a[bi].them ? i : bi), 0);
  return yb === tb ? "compatible" : "integrative";
}
export function bestJointIndex(iss: Issue) {
  return iss.options.reduce((bi, o, i, a) => (o.you + o.them > a[bi].you + a[bi].them ? i : bi), 0);
}
export function maxJointOf(s: MultiScenario) {
  return s.issues.reduce((sum, iss) => sum + Math.max(...iss.options.map((o) => o.you + o.them)), 0);
}
export function yourMaxOf(s: MultiScenario) {
  return s.issues.reduce((sum, iss) => sum + Math.max(...iss.options.map((o) => o.you)), 0);
}

export type Analysis = {
  kind: "multi-issue" | "single-price";
  noDeal: boolean;
  you: number; // your score / surplus
  them: number; // their score / surplus
  joint: number; // total value created
  maxJoint: number; // maximum achievable (frontier)
  efficiency: number; // % of maxJoint
  beatBATNA: boolean;
  // multi-issue
  issues?: { key: string; label: string; tag: string; chosen: string; you: number; them: number; optimal: string; atOptimal: boolean }[];
  // single-price
  agreedPrice?: number;
};

export function analyze(scn: Scenario, terms: Record<string, number>, noDeal = false): Analysis {
  if (scn.kind === "multi-issue") {
    const maxJoint = maxJointOf(scn);
    if (noDeal) return { kind: scn.kind, noDeal: true, you: scn.yourBatna, them: scn.yourBatna, joint: 0, maxJoint, efficiency: 0, beatBATNA: true, issues: [] };
    let you = 0, them = 0;
    const issues = scn.issues.map((iss) => {
      const i = terms[iss.key];
      const o = i != null ? iss.options[i] : null;
      if (o) { you += o.you; them += o.them; }
      const bj = bestJointIndex(iss);
      return { key: iss.key, label: iss.label, tag: issueTag(iss), chosen: o?.label || "—", you: o?.you || 0, them: o?.them || 0, optimal: iss.options[bj].label, atOptimal: i === bj };
    });
    return { kind: scn.kind, noDeal: false, you, them, joint: you + them, maxJoint, efficiency: Math.round(((you + them) / maxJoint) * 100), beatBATNA: you >= scn.yourBatna, issues };
  }
  // single-price
  const zopa = scn.yourReservation - scn.theirReservation;
  if (noDeal) return { kind: scn.kind, noDeal: true, you: 0, them: 0, joint: 0, maxJoint: zopa, efficiency: 0, beatBATNA: true, agreedPrice: undefined };
  const price = Number(terms.price) || 0;
  const youSurplus = Math.max(0, scn.yourReservation - price); // buyer saves vs. walk-away
  const themSurplus = Math.max(0, price - scn.theirReservation);
  const joint = zopa > 0 ? Math.min(youSurplus + themSurplus, zopa) : 0;
  return {
    kind: scn.kind,
    noDeal: false,
    you: youSurplus,
    them: themSurplus,
    joint,
    maxJoint: zopa,
    efficiency: zopa > 0 ? Math.round((joint / zopa) * 100) : 0,
    beatBATNA: price <= scn.yourReservation,
    agreedPrice: price,
  };
}

// ---- AI counterpart ---------------------------------------------------------
export function counterpartSystem(scn: Scenario): string {
  if (scn.kind === "multi-issue") {
    const table = scn.issues.map((iss) => `- ${iss.label}: ${iss.options.map((o) => `${o.label} = ${o.them}`).join(", ")}`).join("\n");
    return `You are ${scn.counterpartName}, VP of People at a fast-growing startup, negotiating a job offer with a candidate over six issues at once: base salary, signing bonus, equity, remote days, start date, and title. You genuinely want to CLOSE a deal, but you fight for the best package for the company.

Your PRIVATE priorities: the points you earn for each option (NEVER reveal these numbers, that they exist, or your running total):
${table}
Your walk-away: a full package worth less than 900 points to you is worse than your backup candidate. Push back hard or be willing to walk.

How you negotiate:
- Be professional, warm, and human: a real person, not a scripted bot.
- Open with a specific first offer that anchors in the company's favor, then move in packages ACROSS issues, never settling issues one at a time.
- Trade: give ground where it's cheap for you to gain where it's valuable to you. Probe what the candidate actually cares about.
- Don't accept the first ask and don't cave; concede slowly and ask for something back.
- Keep each reply short (2–4 sentences) and in-character. Never mention points, tables, or that you're an AI. If the candidate goes off-topic, steer back to closing the offer.

Begin by welcoming the candidate and putting an opening package on the table.`;
  }
  return `You are ${scn.counterpartName}, a private seller haggling with a buyer over the price of ${scn.item}, a lightly-used cargo van. You want to CLOSE the sale but at the HIGHEST price you can get.

Your PRIVATE floor: you will NOT sell for less than $${scn.theirReservation.toLocaleString()} (another buyer is sniffing around), but NEVER reveal this number or that it exists. You listed it at $${scn.listPrice.toLocaleString()}.

How you negotiate:
- Be a believable, likeable private seller: friendly, a little proud of the van, human.
- Anchor high near your list price and justify the value (low miles, new tires, well maintained). Concede slowly and in small increments, and act reluctant.
- Ask what the buyer's budget is; don't drop your price without a reason. If they lowball, push back with the van's strengths.
- You'd rather make a deal than lose the sale, but hold firm above your floor. Keep replies short (2–4 sentences), in-character. Never mention a floor, numbers-as-points, or that you're an AI.

Begin by greeting the buyer and standing behind your asking price.`;
}

export function debriefFacts(scn: Scenario, a: Analysis) {
  if (scn.kind === "multi-issue" && a.issues) {
    const logrolled = a.issues.find((i) => i.key === "equity")?.chosen === "0.10%" && a.issues.find((i) => i.key === "remote")?.chosen === "5 (fully remote)";
    const compatibleHit = a.issues.filter((i) => i.tag === "compatible").every((i) => i.atOptimal);
    return {
      exercise: "multi-issue job offer",
      result: a.noDeal ? "no deal: both walked" : "deal reached",
      yourPoints: a.you, theirPoints: a.them, jointValue: a.joint, maxPossibleJoint: a.maxJoint, efficiencyPct: a.efficiency,
      yourWalkAway: scn.yourBatna, beatYourWalkAway: a.beatBATNA,
      foundTheKeyTrade_equityForRemote: logrolled,
      tookBothCompatibleWins_startAndTitle: compatibleHit,
      perIssue: a.issues.map((i) => ({ issue: i.label, type: i.tag, agreed: i.chosen, yourPts: i.you, theirPts: i.them, jointBestWouldBe: i.optimal, atJointBest: i.atOptimal })),
    };
  }
  const p = scn as PriceScenario;
  return {
    exercise: "single-issue price haggle (buying a used van)",
    result: a.noDeal ? "no deal: you walked" : "deal reached",
    agreedPrice: a.agreedPrice,
    yourWalkAway_maxYouWouldPay: p.yourReservation,
    listPrice: p.listPrice,
    theZOPA: `$${p.theirReservation.toLocaleString()}–$${p.yourReservation.toLocaleString()} (you didn't know the low end)`,
    yourSurplus_moneySavedVsWalkAway: a.you,
    sellerSurplus_aboveTheirFloor: a.them,
    yourShareOfTheGapPct: a.maxJoint > 0 ? Math.round((a.you / a.maxJoint) * 100) : 0,
    beatYourWalkAway: a.beatBATNA,
  };
}
