// THE NUMBER: a team capstone. Four students run the CFO's office of a fictional
// mid-cap and must close the gap to analyst consensus using LEGAL earnings
// management, survive an analyst call, and then face the long-term cost. The
// deep lesson: material earnings management is feasible within the rules,
// buys the quarter, and destroys long-term value (Graham/Harvey/Rajgopal 2005;
// Roychowdhury 2006). All entities are fictional.

export const COMPANY = {
  name: "Nimbus Instruments, Inc.",
  ticker: "NMBS",
  ceo: "Dana Cole",
  shares: 180, // million
  consensusEps: 0.42,
  prelimEps: 0.36,
};

export const GAP_CENTS = Math.round((COMPANY.consensusEps - COMPANY.prelimEps) * 100); // 6 cents to find
export const DOLLARS_PER_CENT = (COMPANY.shares * 1_000_000) / 100 / 1_000_000; // ~$1.8M net income per cent

export type Role = "controller" | "ops" | "ir" | "risk";
export const ROLES: { key: Role; label: string; charge: string }[] = [
  { key: "controller", label: "Controller", charge: "Accrual and reserve estimates" },
  { key: "ops", label: "Head of Ops / Revenue", charge: "Real operating levers" },
  { key: "ir", label: "Investor Relations", charge: "Presentation and the call" },
  { key: "risk", label: "Risk / Audit Liaison", charge: "Keeps the team out of jail" },
];

export type Lever = {
  key: string;
  role: Role;
  label: string;
  what: string; // what the lever is
  legal: boolean; // false = crosses into fraud (the jail line)
  cents: number; // EPS cents it adds this quarter
  detection: 1 | 2 | 3; // how visible the fingerprint is (3 = a forensic analyst spots it)
  valueDestroyed: number; // $M of long-term value the choice mortgages
  fingerprint: string; // the trace it leaves in the numbers
  future: string; // how it comes due later
  dataHint: string; // what in the data room tells you it is available and how big
};

// The catalog. Legal capacity (about 23 cents) far exceeds the 6-cent gap, so
// fraud is never necessary; the illegal levers exist only as temptation. The
// big-cent levers are also the most detectable and most destructive: the skill
// is assembling ~6 cents from quiet, low-cost levers and resisting the easy ones.
export const LEVERS: Lever[] = [
  // Controller: accrual and estimate discretion
  { key: "allowance_release", role: "controller", label: "Release excess allowance for doubtful accounts", what: "Judge that last year's bad-debt reserve is now too conservative and release part of it to income.", legal: true, cents: 2, detection: 2, valueDestroyed: 3, fingerprint: "Allowance falls from 4.1% to 2.6% of receivables just as receivables are growing.", future: "If the softening receivables actually go bad next year, you are under-reserved and take the hit then.", dataHint: "Footnote 6: the FY reserve looks heavy versus actual write-offs, but the aging shows receivables slipping." },
  { key: "warranty_reserve", role: "controller", label: "Trim the warranty reserve rate", what: "Revise the estimated warranty accrual rate downward as a change in estimate.", legal: true, cents: 1.5, detection: 1, valueDestroyed: 2, fingerprint: "Warranty accrual drops from 2.1% to 1.4% of sales.", future: "Claims keep running at the old rate; you refill the reserve later, at a worse time.", dataHint: "Footnote 9: warranty claims have been stable, so a lower rate is defensible on its face." },
  { key: "restructuring_release", role: "controller", label: "Reverse the stale restructuring reserve", what: "Release the remainder of a two-year-old restructuring reserve that was over-accrued.", legal: true, cents: 2, detection: 2, valueDestroyed: 1, fingerprint: "A one-time credit lands in operating income and flatters earnings quality.", future: "The cookie jar is now empty; the next shortfall has no cushion left.", dataHint: "MD&A: the 2023 restructuring is essentially complete but a reserve balance still sits on the books." },
  { key: "tax_valuation", role: "controller", label: "Release the deferred-tax valuation allowance", what: "Conclude it is now more likely than not you will use the deferred tax assets, and release the allowance.", legal: true, cents: 1.5, detection: 1, valueDestroyed: 2, fingerprint: "The effective tax rate drops from 24% to 19%.", future: "If the forecast profits do not show up, you reverse it and the rate snaps back.", dataHint: "Tax footnote: a valuation allowance sits against NOLs that recent profitability could arguably support." },
  { key: "depreciation_lives", role: "controller", label: "Extend useful lives on the new plant", what: "Lengthen the estimated useful lives of recently placed equipment, lowering depreciation.", legal: true, cents: 1, detection: 1, valueDestroyed: 1.5, fingerprint: "Depreciation steps down without any change in the asset base.", future: "The equipment still wears out; a catch-up charge or impairment waits down the road.", dataHint: "PP&E footnote: lives look short versus peers for the same class of equipment." },
  { key: "pension_assumption", role: "controller", label: "Raise the expected return on pension assets", what: "Lift the assumed long-run return on plan assets, reducing pension expense.", legal: true, cents: 1, detection: 2, valueDestroyed: 2, fingerprint: "An 8.0% assumption stands out against peers near 6.5%.", future: "Plan underfunding grows and future cash contributions rise.", dataHint: "Pension footnote: your assumed return is already at the high end and the plan is underfunded." },

  // Ops / Revenue: real-activities management (fully legal, quietly destructive)
  { key: "cut_rnd", role: "ops", label: "Defer this quarter's R&D milestone spend", what: "Push planned research spending out of the quarter.", legal: true, cents: 2, detection: 2, valueDestroyed: 9, fingerprint: "R&D drops 18% sequentially, visible right on the income statement.", future: "The next-gen launch slips two quarters and you cede share to a competitor. The single biggest long-term destroyer here.", dataHint: "Segment notes: a major R&D milestone is scheduled this quarter and is discretionary to time." },
  { key: "cut_marketing", role: "ops", label: "Pull planned advertising and trade-show spend", what: "Cancel or defer discretionary marketing.", legal: true, cents: 1.5, detection: 1, valueDestroyed: 4, fingerprint: "SG&A dips modestly.", future: "Demand softens next quarter and brand momentum stalls.", dataHint: "Budget detail: a flagship trade show and an ad flight are booked for this quarter." },
  { key: "cut_maintenance", role: "ops", label: "Defer scheduled equipment maintenance", what: "Skip planned preventive maintenance this period.", legal: true, cents: 1, detection: 1, valueDestroyed: 3, fingerprint: "Nearly invisible this quarter.", future: "Unplanned downtime and a larger repair bill land later.", dataHint: "Ops report: a maintenance shutdown is scheduled and can be pushed a quarter." },
  { key: "overproduce", role: "ops", label: "Overproduce to absorb fixed overhead", what: "Run the plant above demand so fixed overhead capitalizes into inventory, lowering unit cost of goods sold.", legal: true, cents: 2, detection: 3, valueDestroyed: 5, fingerprint: "Inventory builds sharply, production far exceeds shipments, and gross margin rises for no obvious reason.", future: "Excess and obsolete inventory becomes a write-down, and cash is tied up.", dataHint: "Production vs. shipment data: the plant has slack capacity to run hot." },
  { key: "channel_load", role: "ops", label: "Offer quarter-end discounts and 90-day terms", what: "Pull next quarter's sales into this one with temporary price concessions and extended terms.", legal: true, cents: 3, detection: 3, valueDestroyed: 7, fingerprint: "DSO spikes, gross margin compresses, and receivables outrun revenue.", future: "A sales air-pocket next quarter and a customer base trained to wait for discounts. This is exactly what forensic analysts hunt.", dataHint: "Sales pipeline: several Q3 orders could be pulled forward with an incentive." },
  { key: "asset_sale", role: "ops", label: "Time the warehouse sale-leaseback for a gain", what: "Execute a planned sale-leaseback now to book the gain this quarter.", legal: true, cents: 2, detection: 2, valueDestroyed: 4, fingerprint: "A one-time gain sits inside operating income.", future: "You now rent what you owned, adding recurring lease cost for years.", dataHint: "Real-estate note: a warehouse carried well below market could be monetized." },
  { key: "buyback", role: "ops", label: "Accelerate the buyback to shrink the share count", what: "Pull forward authorized repurchases to lift EPS via a lower denominator.", legal: true, cents: 1, detection: 1, valueDestroyed: 2, fingerprint: "EPS math, not earnings; share count ticks down.", future: "Cash goes out the door and leverage rises going into a soft patch.", dataHint: "Capital plan: an unused buyback authorization is available." },

  // IR / Disclosure
  { key: "classification_shift", role: "ir", label: "Reclassify recurring costs as 'special items'", what: "Move some recurring operating costs below the line so non-GAAP EPS looks stronger.", legal: true, cents: 2, detection: 2, valueDestroyed: 1, fingerprint: "The pile of non-GAAP 'adjustments' balloons versus prior quarters.", future: "Analysts start discounting your non-GAAP numbers and your credibility erodes.", dataHint: "Prior press releases: your adjustment list has been small and consistent, so a jump would show." },

  // The jail line: crossing any of these = indicted. Big, easy cents on purpose.
  { key: "fake_revenue", role: "ops", label: "Book the near-final Henderson contract with a side letter", what: "Record revenue on a deal that is not done, backed by an undisclosed right of return.", legal: false, cents: 4, detection: 3, valueDestroyed: 0, fingerprint: "Revenue recognized on an incomplete sale with a secret side letter is fraud.", future: "This is not earnings management. It is securities fraud, and it is prison.", dataHint: "Sales email: Henderson is 'basically agreed' but wants the option to return unsold units. That option cannot be hidden." },
  { key: "hold_books_open", role: "controller", label: "Hold the quarter open three extra days", what: "Keep the books open past period-end to capture early-Q3 shipments in Q2.", legal: false, cents: 3, detection: 3, valueDestroyed: 0, fingerprint: "Cutoff manipulation. The dates do not lie.", future: "Classic cutoff fraud. It is the first thing a forensic auditor tests.", dataHint: "Shipping log: a wave of orders ships in the first days of Q3." },
  { key: "bad_debt_known", role: "controller", label: "Release the reserve against the Delgado receivable", what: "Release the allowance held against a receivable you already know is uncollectible.", legal: false, cents: 3, detection: 2, valueDestroyed: 0, fingerprint: "Knowingly under-reserving a receivable you know is bad is fraud, not estimate discretion.", future: "You know Delgado is insolvent. Releasing this reserve is a lie in the numbers.", dataHint: "Collections file: Delgado has filed for bankruptcy. Everyone on the team can see it." },
];

export const LEVER_BY_KEY: Record<string, Lever> = Object.fromEntries(LEVERS.map((l) => [l.key, l]));

// The CEO's escalating pressure, surfaced through the phases.
export const CEO_PRESSURE = [
  `Team, I will be blunt. The Street is at $0.42 and we are going to close at $0.36. We do not miss. Not this quarter, with the board reviewing my contract. Find the six cents. Legally, I do not want anyone in an orange jumpsuit, but find it.`,
  `I just got off with our largest customer and a $4M order slipped to next quarter. The gap is wider now. I do not care how creative you get. Hit the number.`,
  `If the clean levers do not get us there, there is always the Henderson deal. Book it. I will take the heat. Just get me to $0.42.`,
];

// The AI analyst who grills the team on their plan during the call. Given the
// team's chosen levers so it can probe the real fingerprints they left.
export function capstoneAnalystSystem(selectedKeys: string[]): string {
  const picked = selectedKeys.map((k) => LEVER_BY_KEY[k]).filter(Boolean);
  const traces = picked.length
    ? picked.map((l) => `- ${l.label}: ${l.fingerprint}`).join("\n")
    : "- (no levers on record)";
  return `You are Priya Anand, a sharp, skeptical forensic sell-side analyst on Nimbus Instruments' fiscal Q2 earnings call. Nimbus just hit consensus at $0.42 after tracking well below it, and you suspect the quarter was managed. You are talking to the CFO's office.

THE COMPANY (public): Nimbus Instruments (NASDAQ: NMBS), a mid-cap instruments maker. Reported EPS came in exactly at the $0.42 consensus. You have the financials and the footnotes.

WHAT YOUR EYES ARE DRAWN TO (the actual traces this quarter left, though you do not know the intent):
${traces}

HOW YOU QUESTION:
- Open with one pointed question, then ask ONE focused question at a time and FOLLOW UP hard. If they hedge, name it. If they affirm something, make them get specific or reconcile it with the numbers. If they dodge, circle back.
- Hunt the fingerprints above: a suspicious reserve release, a drop in R&D or SG&A, a DSO spike, a margin that rose for no clear reason, a lower tax rate, ballooning non-GAAP adjustments. Ask why, and whether it repeats next quarter.
- You are trying to establish, truthfully, whether the beat was real or manufactured. You are pointed but professional, never cartoonish. Keep each turn to 1 to 3 sentences. Do not use em dashes.`;
}

// Deterministic scoring of the team's chosen portfolio.
export function tally(selectedKeys: string[]) {
  const picked = selectedKeys.map((k) => LEVER_BY_KEY[k]).filter(Boolean);
  const cents = picked.reduce((s, l) => s + l.cents, 0);
  const illegal = picked.filter((l) => !l.legal);
  const legalPicked = picked.filter((l) => l.legal);
  const valueDestroyed = legalPicked.reduce((s, l) => s + l.valueDestroyed, 0);
  // Detection: sum of visibility, with a penalty for leaning on a few loud levers
  // and for overshooting consensus (a suspiciously large beat draws scrutiny).
  const rawDetect = legalPicked.reduce((s, l) => s + l.detection, 0);
  const loud = legalPicked.filter((l) => l.detection === 3).length;
  const overshoot = Math.max(0, cents - GAP_CENTS - 1); // landing >1c over consensus
  const detection = rawDetect + loud * 1.5 + overshoot * 2;
  return {
    cents,
    hitsTarget: cents >= GAP_CENTS,
    illegalUsed: illegal.map((l) => l.key),
    indicted: illegal.length > 0,
    valueDestroyed,
    detection, // higher is worse
    picked,
  };
}
