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

// ---------------------------------------------------------------------------
// Scenario 3 — "Ask for a Raise" (multi-issue; you are the employee)
// ---------------------------------------------------------------------------
const RAISE: MultiScenario = {
  kind: "multi-issue",
  slug: "ask-for-a-raise",
  exercise: "raise",
  name: "Ask for a Raise",
  counterpartName: "Dana Okafor",
  youRole: "the Employee",
  themRole: "your Manager",
  yourBatna: 700,
  scenario:
    "You've had a strong year and you're sitting down with your manager, Dana Okafor, to talk about your package for next year — across pay and several other things at once. You have a real outside option, so you don't have to accept a weak deal, but you'd like to stay. Some things Dana can give cheaply that matter a lot to you; some are a real cost to the team. The best outcomes come from trading, not just pushing on the raise.",
  issues: [
    { key: "raise", label: "Base pay raise", options: [
      { label: "3%", you: 0, them: 800 }, { label: "5%", you: 250, them: 550 }, { label: "8%", you: 500, them: 250 }, { label: "12%", you: 800, them: 0 },
    ] },
    { key: "title", label: "Title", options: [
      { label: "No change", you: 0, them: 150 }, { label: "Senior", you: 250, them: 80 }, { label: "Lead", you: 450, them: 0 },
    ] },
    { key: "remote", label: "Remote days / week", options: [
      { label: "0", you: 0, them: 300 }, { label: "2 days", you: 300, them: 180 }, { label: "4 days", you: 550, them: 0 },
    ] },
    { key: "pto", label: "Extra PTO", options: [
      { label: "None", you: 0, them: 250 }, { label: "1 week", you: 150, them: 130 }, { label: "2 weeks", you: 300, them: 0 },
    ] },
    { key: "review", label: "Next review", options: [
      { label: "In 12 months", you: 0, them: 300 }, { label: "In 9 months", you: 150, them: 150 }, { label: "In 6 months", you: 300, them: 0 },
    ] },
    { key: "dev", label: "Learning budget", options: [
      { label: "$0", you: 0, them: 200 }, { label: "$3k", you: 150, them: 120 }, { label: "$6k", you: 300, them: 0 },
    ] },
  ],
};

// ---------------------------------------------------------------------------
// Scenario 4 — "Close the Vendor Deal" (multi-issue; you are the buyer)
// ---------------------------------------------------------------------------
const VENDOR: MultiScenario = {
  kind: "multi-issue",
  slug: "close-the-vendor-deal",
  exercise: "vendor-deal",
  name: "Close the Vendor Deal",
  counterpartName: "Priya Raman",
  youRole: "the Buyer",
  themRole: "the Vendor's Account Exec",
  yourBatna: 800,
  scenario:
    "You're buying software for your team and negotiating the contract with Priya Raman, the vendor's account exec — price and terms all at once. You have a viable alternative vendor (your walk-away), so you can hold firm. Priya cares a lot about some terms (contract length, a reference case study) that cost you little, and you care a lot about others (price, payment terms, the support tier). Find the trades.",
  issues: [
    { key: "price", label: "Price / seat / mo", options: [
      { label: "$40", you: 0, them: 800 }, { label: "$34", you: 250, them: 550 }, { label: "$28", you: 500, them: 250 }, { label: "$22", you: 800, them: 0 },
    ] },
    { key: "term", label: "Contract length", options: [
      { label: "1 year", you: 250, them: 0 }, { label: "2 years", you: 150, them: 300 }, { label: "3 years", you: 0, them: 550 },
    ] },
    { key: "payment", label: "Payment terms", options: [
      { label: "Annual upfront", you: 0, them: 400 }, { label: "Quarterly", you: 250, them: 200 }, { label: "Monthly", you: 450, them: 0 },
    ] },
    { key: "support", label: "Support tier", options: [
      { label: "Standard", you: 0, them: 250 }, { label: "Priority", you: 300, them: 130 }, { label: "Dedicated CSM", you: 550, them: 0 },
    ] },
    { key: "onboarding", label: "Onboarding", options: [
      { label: "Paid ($8k)", you: 0, them: 300 }, { label: "Half-price", you: 200, them: 150 }, { label: "Included", you: 400, them: 0 },
    ] },
    { key: "reference", label: "Be a reference", options: [
      { label: "No", you: 200, them: 0 }, { label: "Logo only", you: 120, them: 250 }, { label: "Case study", you: 0, them: 500 },
    ] },
  ],
};

// ---------------------------------------------------------------------------
// Scenario 5 — "Lease the Space" (single-issue price; you are the tenant)
// ---------------------------------------------------------------------------
const LEASE: PriceScenario = {
  kind: "single-price",
  slug: "lease-the-space",
  exercise: "lease",
  name: "Lease the Space",
  counterpartName: "Morgan Bell",
  youRole: "the Tenant",
  themRole: "the Landlord",
  role: "buyer",
  yourReservation: 9000, // most you'd pay per month (a comparable space is your backup)
  theirReservation: 6500, // Morgan's floor (private)
  listPrice: 9800,
  unit: "$",
  item: "the monthly rent on the office",
  scenario:
    "Your team is growing and you're negotiating the monthly rent on an office with the landlord, Morgan Bell. You've toured comparable spaces around $8–9k and one you could take for $9,000, so you will NOT pay more than that here. Morgan is asking $9,800. It comes down to one number: agree on the rent, or walk. Anchor well, know your walk-away, and claim as much of the gap as you can.",
};

export const SCENARIOS: Scenario[] = [OFFER, HAGGLE, RAISE, VENDOR, LEASE];
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
    return `You are ${scn.counterpartName}, ${scn.themRole}, negotiating with ${scn.youRole} over several issues at once: ${scn.issues.map((i) => i.label).join(", ")}. You genuinely want to CLOSE a deal, but you fight hard for the best outcome for your side.

The situation: ${scn.scenario}

Your PRIVATE priorities — the points you earn for each option (NEVER reveal these numbers, that they exist, or your running total):
${table}
Your walk-away: don't accept a lopsided package that's clearly bad for your side. Push back hard, or be willing to walk, if the other side won't trade.

How you negotiate:
- Be professional, warm, and human — a real person true to your role as ${scn.themRole}, not a scripted bot.
- Open with a specific first offer that anchors in your favor, then move in packages ACROSS issues, never settling issues one at a time.
- Trade: give ground where it's cheap for you to gain where it's valuable to you. Probe what the other side actually cares about.
- Don't accept the first ask and don't cave; concede slowly and ask for something in return.
- Keep each reply short (2–4 sentences) and in-character. Never mention points, tables, or that you're an AI. If they go off-topic, steer back to closing the deal.

Begin by greeting ${scn.youRole} and putting an opening package on the table.`;
  }
  return `You are ${scn.counterpartName}, ${scn.themRole}, haggling with ${scn.youRole} over the price of ${scn.item}. You want to CLOSE the deal, but at the HIGHEST price you can get.

The situation: ${scn.scenario}

Your PRIVATE floor: you will NOT go below ${scn.unit}${scn.theirReservation.toLocaleString()} (you have another option), but NEVER reveal this number or that it exists. The asking figure on the table is ${scn.unit}${scn.listPrice.toLocaleString()}.

How you negotiate:
- Be a believable, likeable ${scn.themRole}: friendly, a little firm, human.
- Anchor high near the asking figure and justify the value. Concede slowly, in small increments, and act a little reluctant.
- Ask about the other side's needs; don't drop your number without a reason. If they lowball, push back with real justification.
- You'd rather make a deal than lose it, but hold firm above your floor. Keep replies short (2–4 sentences), in-character. Never mention your floor, numbers-as-points, or that you're an AI.

Begin by greeting ${scn.youRole} and standing behind the ${scn.unit}${scn.listPrice.toLocaleString()} figure.`;
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
