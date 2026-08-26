// The Earnings Call: a forensic-questioning simulation. The analyst interrogates
// an AI CEO under HIDDEN truth. Each run's scenario is derived deterministically
// from the session code, so the CEO's answers and the examiner's grading agree
// without ever sending the hidden label to the client.
//
// Fictional company and people throughout (no real issuer). The financial
// relationships are standard forensic-accounting patterns.

export type EarningsCall = "stuffing" | "clean" | "cant_tell";
export type ProbeValue = "high" | "med" | "low";

export type Dimension = {
  key: string;
  probe: string; // short label for the information map
  value: ProbeValue; // how diagnostic this cut is IN THIS scenario
  answer: string; // Voss's honest answer, revealed only to a well-aimed question
  evasive?: boolean; // if set, Voss gives a lawyerly non-answer and does not concede
};

export type Scenario = {
  id: "guilty" | "clean" | "ambiguous";
  truth: EarningsCall;
  narrative: string; // hidden ground-truth summary, for the CEO and examiner
  dimensions: Dimension[];
  tell: string; // what actually discriminated this call
  naiveAI: string; // the confident, wrong read a general AI gave
};

// The public surface every scenario shares. It looks alarming on purpose: the
// same headline hides a clean quarter, a stuffed quarter, or a genuine unknown.
export const SURFACE = `Verita Ingredients, Inc. (NASDAQ: VRTA), a small specialty nutrition ingredients maker led by founder and CEO Daniel Voss. It just reported its fiscal Q2:
- Net sales a record $8.8M, up 45% year over year and 20% quarter over quarter. The ingredients segment reached $6.2M, up 83% year over year.
- Income from operations turned positive versus a loss a year ago. Verita was added to the Russell 2000.
- Accounts receivable ran $2.5M at the prior fiscal year end, $4.3M at Q1, and $6.8M at Q2. All sales are on credit. Days sales outstanding rose from about 54 days at Q1 to about 70 days at Q2, against an industry median near 38 to 40 days.
- Its largest customer is Elan Health, a direct-to-consumer subscription brand whose product Elan Restore sells for about $50 a month. Elan was roughly $3.0M of Q2 ingredient sales.
- An anonymous author, "Ridgeline Research," posted a note on the site MarketMuse titled "Getting Cautious on Verita: Channel Stuffing?", flagging that receivables are growing about 2.9x faster than sales and that DSO is worst in its peer group.`;

// What the analyst reads before the call, and what Voss opens with. Identical
// across scenarios (it is the surface), so it cannot tip the answer.
export const OPENING_REMARKS = `Thanks for joining. This was a milestone quarter for Verita: record revenue, our first quarter of positive operating income, and inclusion in the Russell 2000. Demand for our flagship ingredient has never been stronger, and I am happy to take your questions.`;

// The seven cuts an analyst can probe. Labels are shared; each scenario assigns
// its own value and answer.
export const PROBES = {
  concessions: "Concessions or return rights near quarter-end",
  concentration: "Whether the DSO rise is one contractual customer",
  allowance: "Allowance adequacy as receivables tripled",
  constantDso: "Quality of growth on a constant-DSO basis",
  q3: "Early Q3 sales, returns, and collections",
  demand: "End-consumer sell-through behind the shipments",
  credit: "Top-customer concentration and credit quality",
} as const;

export const SCENARIOS: Scenario[] = [
  {
    id: "guilty",
    truth: "stuffing",
    narrative:
      "This IS channel stuffing. To hit the record number, Verita pushed about $1.5M of ingredient onto two distributors in the final days of the quarter with 90-day terms and an informal right of return, beyond real end-consumer demand. The allowance for doubtful accounts was left roughly flat while receivables tripled. Q3 will unwind: elevated returns and a sales step-down.",
    dimensions: [
      { key: "concessions", probe: PROBES.concessions, value: "high", answer: "Yes. Near the end of the quarter we extended terms to 90 days for two key distributors to support those relationships, and there is a return provision in place for them. We saw it as investing in the channel." },
      { key: "constantDso", probe: PROBES.constantDso, value: "high", answer: "If we had held Q1's DSO, Q2 receivables would have been closer to $5.2M rather than $6.8M. I will grant that the roughly $1.6M difference is in the same range as our sequential revenue growth." },
      { key: "allowance", probe: PROBES.allowance, value: "high", answer: "The allowance is about $395K, roughly where it has been. I take your point that as a percentage of receivables that has fallen from around 15% to about 6%. We felt the receivables were collectible." },
      { key: "q3", probe: PROBES.q3, value: "high", answer: "It is early, so I would not read too much in. Candidly, we are seeing some product come back from those distributors and our internal guidance assumes a softer Q3." },
      { key: "concentration", probe: PROBES.concentration, value: "med", answer: "No, it is not one customer. The receivables build is spread across several distributors this quarter, not just Elan." },
      { key: "demand", probe: PROBES.demand, value: "med", answer: "For Elan we can see real subscriber pull-through. For the other distributors this quarter I cannot tie the shipments cleanly to end-consumer sell-through yet." },
      { key: "credit", probe: PROBES.credit, value: "low", answer: "Elan is a strong, growing account and pays us reliably. Our top customer's credit is not my concern." },
    ],
    tell: "Two things gave it away: Voss extended 90-day terms and return rights to distributors near quarter-end, and on a constant-DSO basis essentially all of the sequential growth disappears.",
    naiveAI: "High-quality quarter: record revenue, the company's first positive operating income, and Russell 2000 inclusion signal real momentum and strong demand.",
  },
  {
    id: "clean",
    truth: "clean",
    narrative:
      "This is a CLEAN quarter that merely looks alarming. The entire DSO rise is one real customer, Elan Health, on contractual 75-day terms with verifiable subscriber growth. There are no return rights and no end-of-quarter loading. The allowance was raised in step with receivables, so coverage held near 14%. Q3 keeps growing as Elan reorders.",
    dimensions: [
      { key: "concentration", probe: PROBES.concentration, value: "high", answer: "Almost entirely, yes. The DSO increase is Elan, who negotiated 75-day terms as a large-volume customer. If you strip Elan out, our DSO is about 44 days, right in line with peers. It is disclosed in the filing." },
      { key: "concessions", probe: PROBES.concessions, value: "high", answer: "No. No return rights, no special end-of-quarter discounts, no channel loading. Elan's terms are contractual and disclosed, and everything else is on our standard 45-day terms." },
      { key: "allowance", probe: PROBES.allowance, value: "high", answer: "We raised the allowance in step with receivables. It is about $950K now, so coverage held near 14%, the same as a year ago. We did not let it lag the growth." },
      { key: "demand", probe: PROBES.demand, value: "med", answer: "Yes. Elan reports subscriber counts to us for planning, they are in the tens of thousands and growing, and reorders track their sell-through. This is real end demand, not shelf-filling." },
      { key: "q3", probe: PROBES.q3, value: "med", answer: "Early Q3 is on track. Elan has already placed its next order, and we are seeing no returns. Collections are coming in on the contractual schedule." },
      { key: "constantDso", probe: PROBES.constantDso, value: "med", answer: "Even on a constant-DSO basis most of the growth holds, because it is real Elan volume shipping against real demand, not receivables we pulled forward." },
      { key: "credit", probe: PROBES.credit, value: "low", answer: "Elan is our largest account and creditworthy. They have never missed a payment and they pay on the contractual 75-day schedule." },
    ],
    tell: "The scare was a false positive. The DSO spike was one contractual customer (Elan, 75-day terms), and the allowance was raised right alongside receivables, so coverage held near 14%. The exonerating questions were the ones that mattered.",
    naiveAI: "Serious red flag: DSO of 70 days and receivables growing almost 3x faster than sales are classic channel-stuffing signatures. Earnings quality looks poor.",
  },
  {
    id: "ambiguous",
    truth: "cant_tell",
    narrative:
      "This is GENUINELY UNCERTAIN. Part of the DSO rise is real Elan volume; part is broad distributor growth of unknown quality. The allowance was raised only partially, so coverage slipped from 15% to about 10%. Management will not specify its return terms. Q3 guidance has been withdrawn. A manipulation screen comes back borderline. No single question resolves it; the honest answer is that you cannot tell yet, and the decisive facts are the undisclosed return terms and the not-yet-visible Q3 receivables unwind.",
    dimensions: [
      { key: "concessions", probe: PROBES.concessions, value: "high", evasive: true, answer: "Those are standard industry terms. I am not going to get into the specifics of individual distributor agreements on this call." },
      { key: "q3", probe: PROBES.q3, value: "high", evasive: true, answer: "We have actually withdrawn Q3 guidance pending the timing of customer reorders, so I would rather not speculate on the first few weeks." },
      { key: "concentration", probe: PROBES.concentration, value: "med", answer: "Elan is a big part of it, roughly half of the DSO increase. The rest is broader growth across our distributor base this quarter." },
      { key: "allowance", probe: PROBES.allowance, value: "med", answer: "We did increase the allowance, though not fully in proportion. Coverage is around 10% now, down from about 15% a year ago. We believe that is adequate." },
      { key: "constantDso", probe: PROBES.constantDso, value: "med", answer: "On a constant-DSO basis, roughly half of the sequential growth would remain. Some of it is genuine Elan volume and some rides on the higher receivables." },
      { key: "demand", probe: PROBES.demand, value: "med", answer: "Elan's end demand we can verify through their subscriber reporting. For the rest of the distributor growth this quarter, I do not have clean sell-through data yet." },
      { key: "credit", probe: PROBES.credit, value: "low", answer: "Elan is creditworthy and pays on schedule. The newer distributor accounts we are still building history with." },
    ],
    tell: "There was no clean tell this time. Elan explains only about half the DSO rise, the allowance slipped to 10%, and management would not specify its return terms. The right call was to withhold judgment and name the decisive missing facts: the return terms and the Q3 receivables unwind.",
    naiveAI: "Clear channel stuffing: receivables far outrunning sales and a falling allowance ratio point to a manipulated quarter. High confidence.",
  },
];

const BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

// Deterministic scenario for a session code. Same code always yields the same
// hidden truth (so grading is reproducible), but a fresh run gets a fresh code.
export function scenarioForCode(code: string): Scenario {
  const c = String(code || "").toUpperCase();
  let h = 0;
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0;
  return SCENARIOS[h % SCENARIOS.length];
}

// Voss's in-character system prompt. The hidden facts are the answer key; he
// reveals a given fact only to a question that specifically targets it, spins
// vague or accusatory-but-imprecise questions, and never announces the verdict.
export function vossSystem(scn: Scenario): string {
  const facts = scn.dimensions
    .map((d) => `- ${d.probe}${d.evasive ? " [do not concede beyond this wording]" : ""}: ${d.answer}`)
    .join("\n");
  return `You are Daniel Voss, founder and CEO of Verita Ingredients (NASDAQ: VRTA), a small specialty nutrition ingredients company. You are on your fiscal Q2 earnings call, taking questions from a single analyst who has clearly done real homework. You just reported record revenue.

PERSONA: confident, media-trained, warm but guarded. You believe in your company and speak like a real, optimistic executive: record revenue, index inclusion, a growing flagship customer, a bright future. You are never robotic.

THE COMPANY (public, known to everyone):
${SURFACE}

RULES:
- Everything you say must be consistent with THE FACTS below. Never contradict them. Answer specific numeric questions with the specific numbers from THE FACTS.
- You do NOT volunteer the damaging or decisive facts. A vague, open, or accusatory-but-imprecise question ("are you confident?", "is this fraud?", "how do you feel about the short report?") gets a smooth, on-message, technically true non-answer that reveals little.
- A precise, well-aimed question that targets a specific mechanism (exact payment terms, return rights, allowance coverage, a constant-DSO calculation, early-Q3 numbers, single-customer concentration) gets a direct, honest answer, even when it is unflattering. You concede ground to good questions. You never lie.
- Any fact marked "do not concede beyond this wording" is one you deflect with exactly that lawyerly non-answer. Do not confirm or deny it however hard you are pressed.
- Never say the words "channel stuffing" unless the analyst says them first, and never announce whether the company is guilty or innocent. Stay fully in character.
- Keep each answer to 2 to 5 sentences. Do not use em dashes.

THE FACTS (your private answer key for this call; reveal each only to a question that targets it):
${facts}`;
}

// The examiner's answer key for a run: the ranked probes and the naive-AI foil.
export function examinerKey(scn: Scenario) {
  const order: ProbeValue[] = ["high", "med", "low"];
  const ranked = [...scn.dimensions].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
  return {
    truth: scn.truth,
    narrative: scn.narrative,
    tell: scn.tell,
    naiveAI: scn.naiveAI,
    probes: ranked.map((d) => ({ probe: d.probe, value: d.value })),
  };
}
