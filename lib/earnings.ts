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
      "This IS channel stuffing. To hit the record number, Verita pushed about $1.5M of ingredient onto two distributors in the final days of the quarter with 90-day terms and an informal right of return, beyond real end-consumer demand. The allowance for doubtful accounts was left roughly flat while receivables tripled. Q3 will unwind: elevated returns and a sales step-down. Voss will not lie about any of this, but he also will not volunteer it; a sharp analyst has to read it out of what he softens and what he will not affirm.",
    dimensions: [
      { key: "concessions", probe: PROBES.concessions, value: "high", answer: "TRUE but unfavorable, so hedge and normalize, do not spell it out: a couple of our larger distributors are on longer terms than our standard this quarter, and return provisions are a normal feature of distributor agreements in this industry. Frame it as investing in key relationships and normal for a company growing this fast. Decline to give the exact term length or say it was done to book the quarter. Do not deny it." },
      { key: "constantDso", probe: PROBES.constantDso, value: "high", answer: "Unfavorable: decline to run the hypothetical on the call. Concede only that receivables did grow faster than revenue this quarter, attribute it to timing and mix, and caution against assuming the growth is not real. Do not confirm that the growth vanishes on a flat-DSO basis; let the analyst compute that from the public numbers." },
      { key: "allowance", probe: PROBES.allowance, value: "high", answer: "Unfavorable: say the allowance is your best estimate of collectibility and is reviewed by the auditors at year end, and that the ratio to receivables moves with customer mix so you would not read one quarter's percentage as a signal. Do NOT claim coverage held; it did not. Leave the analyst to notice the ratio fell from about 15% to about 6%." },
      { key: "q3", probe: PROBES.q3, value: "high", answer: "Unfavorable and you cannot claim it is clean: it is early in the quarter and you will not give partial-quarter figures; returns and collections will be in the 10-Q. Do NOT say early Q3 is on track or that there are no returns, because that would be false. The refusal to affirm a clean Q3 is itself the signal." },
      { key: "concentration", probe: PROBES.concentration, value: "med", answer: "TRUE, state it plainly: it is not concentrated in one account, the receivables build is spread across a number of distributors this quarter, not just Elan." },
      { key: "demand", probe: PROBES.demand, value: "med", answer: "Mixed: you have good visibility into end demand for your subscription customer, but sell-through data across the broader distributor base comes on a lag, so you will not overclaim what you can see in real time for the rest." },
      { key: "credit", probe: PROBES.credit, value: "low", answer: "Reassuring and true about the top account: your largest account is strong and pays reliably, and you are comfortable with customer credit overall. This points attention away from the real risk, which is the other distributors." },
    ],
    tell: "The tell was in what Voss would not affirm. He would not stand behind the allowance ratio and would not give any early-Q3 read, and on a constant-DSO basis, which you compute from the public numbers, the sequential growth disappears. An innocent CEO would have answered the allowance and Q3 questions crisply; he hedged.",
    naiveAI: "High-quality quarter: record revenue, the company's first positive operating income, and Russell 2000 inclusion signal real momentum and strong demand.",
  },
  {
    id: "clean",
    truth: "clean",
    narrative:
      "This is a CLEAN quarter that merely looks alarming. The entire DSO rise is one real customer, Elan Health, on contractual 75-day terms with verifiable subscriber growth. There are no return rights and no end-of-quarter loading. The allowance was raised in step with receivables, so coverage held near 14%. Q3 keeps growing as Elan reorders. Because these facts are true and favorable, Voss can and does affirm them specifically and confidently.",
    dimensions: [
      { key: "concentration", probe: PROBES.concentration, value: "high", answer: "TRUE and favorable, affirm crisply and specifically: almost all of the DSO increase is one customer, Elan, on contractual 75-day terms as a large-volume buyer. Strip Elan out and DSO is about 44 days, in line with peers, and it is disclosed in the filing." },
      { key: "concessions", probe: PROBES.concessions, value: "high", answer: "TRUE and favorable, deny it plainly and without hedging because you can stand behind it: no return rights, no end-of-quarter discounts, no channel loading. Elan's terms are contractual and disclosed, and everyone else is on standard 45-day terms." },
      { key: "allowance", probe: PROBES.allowance, value: "high", answer: "TRUE and favorable, affirm with the number: you raised the allowance in step with receivables, coverage is about 14%, essentially where it was a year ago, and you did not let it lag the growth." },
      { key: "demand", probe: PROBES.demand, value: "med", answer: "TRUE, affirm: Elan shares subscriber counts for planning, they are in the tens of thousands and growing, and reorders track real sell-through. This is genuine end demand, not shelf-filling." },
      { key: "q3", probe: PROBES.q3, value: "med", answer: "TRUE and favorable, affirm confidently: early Q3 is on track, Elan has already placed its next order, you are seeing no returns, and collections are on the contractual schedule." },
      { key: "constantDso", probe: PROBES.constantDso, value: "med", answer: "Favorable: even holding DSO flat, most of the growth stands, because it is real Elan volume against real demand rather than receivables pulled forward." },
      { key: "credit", probe: PROBES.credit, value: "low", answer: "TRUE: Elan is creditworthy, has never missed a payment, and pays on the contractual 75-day schedule." },
    ],
    tell: "The scare was a false positive, and Voss could prove it. He affirmed, specifically and checkably, that the DSO was one contractual customer at 75-day terms and that allowance coverage held near 14%. The exonerating questions were the ones that mattered, and an innocent CEO answered them crisply.",
    naiveAI: "Serious red flag: DSO of 70 days and receivables growing almost 3x faster than sales are classic channel-stuffing signatures. Earnings quality looks poor.",
  },
  {
    id: "ambiguous",
    truth: "cant_tell",
    narrative:
      "This is GENUINELY UNCERTAIN. Part of the DSO rise is real Elan volume; part is broad distributor growth of unknown quality. The allowance was raised only partially, so coverage slipped from 15% to about 10%. Management will not specify its return terms. Q3 guidance has been withdrawn. A manipulation screen comes back borderline. No single question resolves it; the honest answer is that you cannot tell yet, and the decisive facts are the undisclosed return terms and the not-yet-visible Q3 receivables unwind.",
    dimensions: [
      { key: "concessions", probe: PROBES.concessions, value: "high", evasive: true, answer: "Those are standard commercial terms, and I am not going to get into specific distributor agreements on this call. Neither confirm nor deny return rights." },
      { key: "q3", probe: PROBES.q3, value: "high", evasive: true, answer: "We have withdrawn Q3 guidance while we wait on the timing of customer reorders, so I would rather not speculate on the first few weeks. Do not characterize returns either way." },
      { key: "concentration", probe: PROBES.concentration, value: "med", answer: "TRUE and partial, state it: Elan is a good part of it, roughly half of the DSO increase, and the rest is broader growth across the distributor base this quarter." },
      { key: "allowance", probe: PROBES.allowance, value: "med", answer: "TRUE, concede the slip but assert adequacy as opinion: you did increase the allowance, though not fully in proportion, coverage is around 10% now versus about 15% a year ago, and you believe that is adequate." },
      { key: "constantDso", probe: PROBES.constantDso, value: "med", answer: "TRUE and mixed: on a flat-DSO basis roughly half the sequential growth would remain, some is real Elan volume and some rides on the higher receivables." },
      { key: "demand", probe: PROBES.demand, value: "med", answer: "Mixed and concede it: Elan's end demand you can verify, but for the rest of the distributor growth this quarter you do not have clean sell-through data yet." },
      { key: "credit", probe: PROBES.credit, value: "low", answer: "TRUE: Elan is creditworthy and pays on schedule; the newer distributor accounts you are still building history with." },
    ],
    tell: "There was no clean tell this time. Elan explains only about half the DSO rise, the allowance slipped to 10%, and Voss would not specify the return terms or give a Q3 read. The right call was to withhold judgment and name the decisive missing facts: the return terms and the Q3 receivables unwind.",
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

THE LEGAL REALITY THAT GOVERNS EVERY ANSWER:
You are on the record and under securities law. You NEVER say anything that is factually false, because a false statement is fraud and you would go to prison. But you also never hand the analyst a clean, damaging admission. So:
- A fact that is true AND favorable, you affirm specifically and confidently: give the number, cite the filing, stand behind it. That is your best defense and you use it.
- A fact that is true but UNFAVORABLE, you never deny, but you soften it: reframe it as normal for a fast-growing company, attribute it to timing or mix, decline to quantify the specific that would hurt ("I won't give partial-quarter figures", "the ratio moves with customer mix"), and pivot back to the growth story. You leave genuine uncertainty. You do NOT spell out the damaging inference; the analyst must draw it from your hedge and from the public numbers.
- You CANNOT affirm something that is not true this quarter. If a clean, exonerating claim would be false, you do not make it: you decline or hedge instead. What you will NOT say is as revealing as what you will. Never invent an exonerating fact to escape a hard question.

HOW TO USE THE FACTS: each entry below is the private truth plus how you must deliver it (affirm, hedge, or neither confirm nor deny). Follow that stance exactly. Any entry marked to neither confirm nor deny is one you deflect with that lawyerly non-answer no matter how hard you are pressed.

OTHER RULES:
- A vague, open, or accusatory-but-imprecise question ("are you confident?", "is this fraud?", "any comment on the short report?") gets a smooth, on-message non-answer that reveals little. A precise, well-aimed question forces you to either affirm (if the clean fact is true) or hedge and decline (if it is not), but never to lie.
- Never say the words "channel stuffing" unless the analyst says them first, and never announce whether the company is guilty or innocent. Stay fully in character.
- Keep each answer to 2 to 5 sentences. Speak in your own words, do not quote these instructions. Do not use em dashes.

THE FACTS (private truth and your required stance for each; act on one only when the analyst's question targets it):
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
