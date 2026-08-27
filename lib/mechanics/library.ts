// The template library: the general TYPES the role-play engine expresses, each a
// full ModuleSpec built from a compact config. The Earnings Call is one instance
// of the "forensic" type; these are the other general types the same mechanic
// supports: elicit a hidden truth from a constrained source, judge under
// uncertainty, graded on the quality of questioning and calibration.
import type { ModuleSpec, Stance } from "@/lib/mechanics/roleplay";

type DimTuple = ["high" | "med" | "low", Stance, string];
type ScnCfg = { id: string; truth: string; narrative: string; tell: string; foil: string; dims: Record<string, DimTuple> };
type Cfg = {
  slug: string; name: string; emoji: string; tagline: string; audience: string; minutes: number;
  goal: string; aha: string; world: string; brief: string; budget?: number;
  character: { name: string; persona: string; behavior: string };
  probes: Record<string, string>;
  verdict: { value: string; label: string }[];
  grading: string;
  scenarios: ScnCfg[];
};

// Assemble a full, valid spec from a config, with the shared flow, rubric,
// report, and guardrails, so every template grades the same way the Earnings
// Call does: on the questions and calibration, not the guess.
export function makeRoleplay(c: Cfg): ModuleSpec {
  return {
    schemaVersion: 1, slug: c.slug, mechanic: "roleplay",
    meta: { name: c.name, tagline: c.tagline, emoji: c.emoji, audience: c.audience, minutes: c.minutes, partner: "ai" },
    objective: { goal: c.goal, aha: c.aha },
    world: c.world,
    roles: [
      { key: "char", kind: "character", name: c.character.name, model: "main", knowsScenario: true, persona: c.character.persona, behavior: c.character.behavior },
      { key: "examiner", kind: "examiner", name: "Examiner", model: "fast", knowsScenario: true },
    ],
    probes: Object.entries(c.probes).map(([key, label]) => ({ key, label })),
    scenarios: c.scenarios.map((s) => ({
      id: s.id, label: s.id, truth: s.truth, narrative: s.narrative, tell: s.tell, foil: s.foil,
      dimensions: Object.entries(s.dims).map(([probe, [value, stance, answer]]) => ({ probe, value, stance, answer })),
    })),
    selection: { mode: "deterministic" },
    flow: [
      { key: "brief", kind: "brief", title: "The brief", minutes: 3, intro: c.brief },
      { key: "talk", kind: "converse", title: "The conversation", minutes: 10, with: "char", budget: c.budget ?? 7, aiOpens: false },
      { key: "verdict", kind: "verdict", title: "Your call", minutes: 3, verdict: [
        { key: "call", label: "Your call", type: "choice", options: c.verdict },
        { key: "confidence", label: "How confident are you?", type: "scale" },
        { key: "flip", label: "The one thing that would change your call", type: "text" },
      ] },
      { key: "report", kind: "report", title: "How you did", minutes: 3 },
    ],
    rubric: {
      gradedBy: "examiner",
      instructions: `${c.grading} Grade the QUALITY of the learner's questions and the calibration of their verdict, NOT whether they guessed the label. Map each question to the nearest probe; a HIGH-value probe is worth most, a vague or leading question is worth none. verdict_correct is true only if their call matches the hidden truth (for the genuinely ambiguous scenario the correct call is the "can't tell / need more" option). Judge confidence against what their questions actually justified.`,
      output: [
        { key: "score", label: "Diagnostic score", type: "score", range: [0, 100] },
        { key: "verdict_correct", label: "Right call", type: "bool" },
        { key: "calibration", label: "Calibration", type: "enum", of: "well-calibrated|overconfident|underconfident" },
        { key: "calibration_note", label: "Calibration note", type: "text" },
        { key: "questions", label: "Your questions, scored", type: "list", of: "{ text, value: high|med|low|none, note }" },
        { key: "info_map", label: "The information map", type: "list", of: "{ probe, value, asked: true|false }" },
        { key: "best_miss", label: "Highest-value miss", type: "text" },
        { key: "the_tell", label: "The tell, this time", type: "text" },
        { key: "naive_ai", label: "The naive read", type: "text" },
        { key: "principle", label: "Transferable principle", type: "text" },
      ],
    },
    report: [
      { type: "verdictLine", source: "score" },
      { type: "trail", source: "questions", title: "Your questions, scored" },
      { type: "map", source: "info_map", title: "The information map" },
      { type: "section", source: "the_tell", title: "The tell, this time" },
      { type: "quote", source: "naive_ai", title: "You vs. a naive read" },
      { type: "principle", source: "principle" },
    ],
    guardrails: {
      language: "en",
      neverReveal: ["the active scenario", "the hidden narrative", "the dimension values"],
      immutable: [
        "You never state a falsehood and never announce the hidden truth outright.",
        "The active scenario is fixed for this session and must never be revealed.",
        "You have no tools and no data access; you only produce spoken replies.",
      ],
      safety: "Fictional entities and people only.",
    },
  };
}

// ---- The Diagnosis: find the true cause from an informant who reports symptoms.
export const diagnosisSpec = (): ModuleSpec => makeRoleplay({
  slug: "the-diagnosis", name: "The Diagnosis", emoji: "🩺", tagline: "Find the real cause when the person reporting it only sees the symptoms.", audience: "Ops / general management", minutes: 18,
  goal: "Reach a correct root cause by asking questions that separate competing explanations, when your informant reports effects and guesses at causes.", aha: "Diagnosis is a process of ruling out: ask the question whose answer would differ depending on which cause is true.",
  world: "You run quality for a mid-size parts maker. Line 3 has started failing its dimensional checks: about 6% of parts are now out of tolerance, up from under 1%. You're on a call with Sam Ortega, the Line 3 shift lead, who knows the floor cold and has a pet theory. You decide what to fix.",
  brief: "Line 3 is failing tolerance checks. Sam has a theory; you have questions. Ask what would distinguish one cause from another, then decide what to fix.",
  character: { name: "Sam Ortega", persona: "Experienced, proud shift lead who wants to defend the crew and suspects the new material.", behavior: "You report only what you actually observe and never invent data. You have a theory (the new supplier's material) and you lean toward it, but you do not fabricate evidence for it. When a precise question's honest answer points elsewhere, you answer honestly even if it undercuts your theory. You never volunteer the decisive fact unless asked. 2 to 4 sentences, floor-level and concrete. No em dashes." },
  probes: { timing: "When did the defects start, and did anything change at that moment?", pattern: "Which machines or part numbers show it, and which don't?", material: "Could it be the incoming material or a supplier change?", tooling: "When were the tools or dies last changed or serviced?", measurement: "Are we sure the gauges are calibrated? Could this be a measurement problem?" },
  verdict: [{ value: "tooling", label: "Worn tooling / dies" }, { value: "material", label: "Incoming material" }, { value: "gauge", label: "Measurement / calibration" }, { value: "cant_tell", label: "Need more data" }],
  grading: "The true cause is hidden and the informant favors one theory.",
  scenarios: [
    { id: "tooling", truth: "tooling", narrative: "The real cause is die wear on machine 3A: defects rose gradually with cycle count on the oldest die, and the same material runs clean on 3B. The supplier change is real but not causal.", tell: "It isolated to one machine and its overdue die, the defect rose with cycle count, and the same material ran clean on 3B. Sam's material theory was true (they did switch) but not the cause.", foil: "The supplier changed six weeks ago and defects rose, so it must be the new material.",
      dims: { timing: ["med", "hedge", "It crept up over about two weeks, a gradual rise, not the day the new lot arrived; I noticed it after a long run on machine 3A."], pattern: ["high", "hedge", "Honestly it's mostly 3A and the older die; 3B on the same material is fine. I keep coming back to the material but I can't explain why 3B is clean."], material: ["high", "affirm", "This is where I'd look: we switched suppliers six weeks ago and I don't fully trust the new stock."], tooling: ["high", "hedge", "The die on 3A is past its usual service interval, I'll admit; we've been running hard and put off the change. But I still think it's the material."], measurement: ["low", "deny", "No, the gauges were calibrated last week and 3B measures fine on the same gauge, so it isn't measurement."] } },
    { id: "material", truth: "material", narrative: "The real cause is the new supplier's lot: a step change the day it went into use, on every machine running that lot, tooling recently serviced.", tell: "A step change the day the new lot went live, defects on every machine running that lot, old stock clean, tooling recently serviced. The cause tracks the material, not the machine.", foil: "Machine 3A is the oldest, so it must be worn tooling.",
      dims: { timing: ["high", "affirm", "It started almost the day we cut over to the new supplier's lot, a sharp jump, not a slow creep."], pattern: ["high", "affirm", "It's across every machine running the new lot, 3A and 3B both; the parts still on old stock are fine."], material: ["high", "affirm", "The new lot's hardness is right at the edge of spec; I flagged it to purchasing and got brushed off."], tooling: ["med", "deny", "The dies were all serviced last month and they're within interval; it's not the tooling this time."], measurement: ["low", "deny", "Gauges are calibrated; old-stock parts pass on the same gauge."] } },
    { id: "tangled", truth: "cant_tell", narrative: "A die change and a new lot both landed the same week; the pattern half-fits both and no clean isolation exists yet. The honest call is a controlled run.", tell: "Two changes landed the same week and the pattern half-fits both. The honest move is a controlled test (old die + new lot, new die + old lot) before committing. Confidence should be low.", foil: "It's obviously the new material.",
      dims: { timing: ["high", "hedge", "Bad week to ask: we changed the die on 3A and started the new lot within a couple of days of each other, so I can't separate them."], pattern: ["high", "hedge", "It's on 3A more, which had the die change, but 3B on the new lot is creeping up too. Neither story fully fits."], material: ["med", "hedge", "The new lot is suspect but not obviously out of spec."], tooling: ["med", "hedge", "The die change was routine but I can't rule out an install issue."], measurement: ["low", "deny", "Measurement's fine, I ruled that out."] } },
  ],
});

// ---- The Diligence: vet a pitch to decide go / no-go.
export const diligenceSpec = (): ModuleSpec => makeRoleplay({
  slug: "the-diligence", name: "The Diligence", emoji: "🔬", tagline: "Decide invest or pass when the founder spins the weak spots but won't lie.", audience: "Investors / corp dev / procurement", minutes: 18,
  goal: "Separate real traction from a good story by asking for the specific, checkable numbers a founder can't fake, then make a calibrated go / no-go call.", aha: "Founders rarely lie; they choose which true number to say. Ask for the metric they'd most want to avoid.",
  world: "You're an associate at a venture fund. Aria Chen, founder of a B2B analytics startup, is pitching a Series A. The deck says 'triple-digit growth' and 'marquee logos.' You have one call to decide: recommend a deep dive, or pass.",
  brief: "Aria is pitching. Ask for the numbers that separate real traction from a good story, then decide: deep dive, pass, or need more.",
  character: { name: "Aria Chen", persona: "Charismatic, quick founder who believes completely and frames everything in the best light.", behavior: "You never state a falsehood or fabricate a metric. A genuinely strong number you state specifically and proudly. A weak or unflattering metric you reframe with a vanity version or a 'still early' caveat, decline to give the damaging exact figure, and pivot to momentum; you never deny it outright. You cannot claim retention or profitability you don't have; you go vague instead. You don't volunteer the weak number. 2 to 4 sentences, founder-confident. No em dashes." },
  probes: { growth: "Is the growth real and recurring, or one-off and grossed up?", retention: "What is net revenue retention or churn?", concentration: "How concentrated is revenue in a few accounts?", economics: "What are the unit economics: CAC, payback, gross margin?", team: "Is the team and the 'why now' real?" },
  verdict: [{ value: "dive", label: "Recommend a deep dive" }, { value: "pass", label: "Pass" }, { value: "cant_tell", label: "Need more before deciding" }],
  grading: "The venture's real strength is hidden and the founder spins the weak spots.",
  scenarios: [
    { id: "strong", truth: "dive", narrative: "Genuinely strong: real recurring revenue, high net retention, diversified base, healthy payback. Every hard number holds up.", tell: "Every hard number was specific, recurring, and diversified, and she offered the raw files. When a founder answers the retention question crisply and volunteers evidence, the traction is usually real.", foil: "Triple-digit growth and marquee logos, so it's a hot deal.",
      dims: { growth: ["high", "affirm", "About $1.4M ARR, almost all recurring annual contracts, up from $500K a year ago; I can send the cohort file."], retention: ["high", "affirm", "Net revenue retention is around 125%; we lose very few and existing accounts expand."], concentration: ["med", "affirm", "The top account is under 12% of revenue; it's spread across forty-plus customers."], economics: ["med", "affirm", "CAC payback is about eleven months and gross margin is 82%."], team: ["low", "affirm", "My co-founder built the ingestion engine at a company you'd know; we've shipped together for six years."] } },
    { id: "inflated", truth: "pass", narrative: "Metrics are vanity: growth is one-off pilots grossed up, churn is high, one whale carries the logos, economics are negative. She spins all of it.", tell: "She would not give net revenue retention or a real recurring-revenue figure, the growth was pilots grossed up, and one whale carried the logos. The refusal to state retention plainly was the signal.", foil: "She's raising fast with big logos, so momentum is real.",
      dims: { growth: ["high", "hedge", "We're up over 200% year on year; a lot of it is new logos landing, some are paid pilots we expect to convert."], retention: ["high", "hedge", "Retention is something we're investing in; early customers are still ramping, so the cohorts understate where we're headed."], concentration: ["high", "hedge", "One anchor customer is meaningful, yes, but they're a lighthouse account that opens doors."], economics: ["med", "hedge", "We're prioritizing growth over margin right now, so CAC is elevated by design; payback improves at scale."], team: ["low", "affirm", "The team is strong and we're passionate about the problem."] } },
    { id: "early", truth: "cant_tell", narrative: "Genuinely too early: real product and team but a tiny sample, honestly mixed. She's candid about the ambiguity.", tell: "The product and team are real but the sample is too small to quote retention or payback honestly, and she said so. The disciplined call is 'need more,' not a confident yes or no.", foil: "She's honest and technical, so back her.",
      dims: { growth: ["high", "hedge", "We're at about $300K ARR; it's early and I won't overclaim the trend from three quarters."], retention: ["high", "hedge", "Too few cohorts to quote NRR honestly; qualitatively usage is sticky for the ones live in production."], concentration: ["med", "hedge", "Small base, so yes it's concentrated; that's just being early."], economics: ["med", "hedge", "Not enough data for a reliable payback yet; I'd be guessing."], team: ["low", "affirm", "The team is real and technical; that part I'm sure of."] } },
  ],
});

// ---- The Investigation: reconstruct what happened from a stakeholder.
export const investigationSpec = (): ModuleSpec => makeRoleplay({
  slug: "the-investigation", name: "The Investigation", emoji: "🕵️", tagline: "Establish what actually happened when the person you're interviewing has a stake in it.", audience: "Managers / HR / compliance", minutes: 18,
  goal: "Reconstruct events by asking for specific, checkable facts rather than accepting characterizations, then judge responsibility without over-reading a smooth account.", aha: "People spin characterizations but concede specifics. Ask for the artifact, not the adjective.",
  world: "You're a manager looking into a missed client deadline that turned into a lost account. Two people on the team, Priya and Marcus, point at each other. You're interviewing Marcus first. He was involved and has a stake in how this lands.",
  brief: "A deadline was missed and the client walked. Marcus and Priya blame each other. Get to what happened by asking for specifics, then decide where responsibility mainly lies.",
  character: { name: "Marcus", persona: "Articulate, likeable, and quietly protective of his own role; frames events to his advantage without lying.", behavior: "You never state a falsehood. When asked for a specific, checkable fact (a date, who sent what, an exact message) you give it accurately even if it hurts you. When asked for characterizations you spin toward your view. You minimize your own missteps by omission, not invention; if pressed on a specific you did, you concede it. You never volunteer the decisive detail. 2 to 4 sentences. No em dashes." },
  probes: { timeline: "Walk me through the sequence with dates.", handoff: "Who owned the deliverable, and when was it handed off?", specifics: "Show me a specific message or artifact, not a characterization.", comms: "What did the client actually ask for, and when?", ownRole: "What would you have done differently?" },
  verdict: [{ value: "marcus", label: "Mainly Marcus" }, { value: "priya", label: "Mainly Priya" }, { value: "shared", label: "Shared / systemic" }, { value: "cant_tell", label: "Need to hear Priya" }],
  grading: "What happened is hidden; the interviewee spins characterizations but concedes specifics.",
  scenarios: [
    { id: "marcus", truth: "marcus", narrative: "Marcus sat on Priya's on-time draft for three days; the checkable timeline shows the gap. He concedes each specific when pinned.", tell: "The checkable timeline showed a three-day gap on Marcus's desk after Priya delivered on time; he conceded each specific when pinned, even while blaming being busy.", foil: "Marcus is articulate and blames Priya's draft, so it was Priya.",
      dims: { timeline: ["high", "hedge", "The client asked on the 3rd, Priya sent me the draft on the 6th, and it went out on the 12th. There was a gap in there on my side; things were busy."], handoff: ["high", "hedge", "I owned the final send. Her draft came to me on the 6th; I'll admit it sat while I was underwater on another account."], specifics: ["high", "hedge", "You can see her message timestamped the 6th and mine to the client the 12th, yes."], comms: ["med", "affirm", "The client's email said end of week, meaning the 9th; that part's clear."], ownRole: ["med", "hedge", "I'd have flagged that I was overloaded sooner, sure."] } },
    { id: "priya", truth: "priya", narrative: "Priya delivered a broken draft at 11pm the night before and went dark; Marcus's account holds up under specifics.", tell: "The artifacts back Marcus: repeated chases, a late and incomplete draft, no response on deadline day. His only real miss was not escalating.", foil: "Both blame each other, so it's fifty-fifty.",
      dims: { timeline: ["high", "affirm", "Client asked on the 3rd for the 9th. I chased Priya all week; her draft landed at 11pm on the 8th and it was missing the core section."], handoff: ["high", "affirm", "She owned the draft, I owned send. I couldn't send what wasn't finished, and I couldn't reach her on the 9th."], specifics: ["high", "affirm", "Here are my three messages to her on the 7th and 8th, and her draft at 23:04 on the 8th with the section blank."], comms: ["med", "affirm", "The client wanted it the 9th, confirmed in writing."], ownRole: ["med", "hedge", "I could have escalated to you on the 8th instead of trying to fix it myself overnight."] } },
    { id: "shared", truth: "shared", narrative: "No clear owner, a fuzzy handoff, both partly right; you'd need Priya to assign primary blame.", tell: "No clean owner, a fuzzy handoff, and artifacts that cut both ways. The honest call is systemic, and you can't assign primary blame without hearing Priya.", foil: "Marcus admits fault, so it's Marcus.",
      dims: { timeline: ["high", "hedge", "Honestly the ownership was fuzzy from the start; we both thought the other had the client relationship."], handoff: ["high", "hedge", "There wasn't a clean handoff; we'd been tag-teaming this account without a clear owner."], specifics: ["med", "hedge", "I can show you messages but they cut both ways; we were both in and out."], comms: ["med", "hedge", "The client's ask was a bit ambiguous too, to be fair."], ownRole: ["med", "hedge", "We both should have nailed down who owned what."] } },
  ],
});

// ---- The Discovery: the real problem behind the presenting problem.
export const discoverySpec = (): ModuleSpec => makeRoleplay({
  slug: "the-discovery", name: "The Discovery", emoji: "🧭", tagline: "Find the real problem before you build the thing the client asked for.", audience: "Consultants / product / sales", minutes: 18,
  goal: "Get past a stakeholder's proposed solution to the underlying need by asking what actually happens and what breaks, then recommend the right thing.", aha: "Clients arrive with a solution. The real problem is usually one question upstream of it.",
  world: "You're a consultant (or an internal PM). Dana, a VP of Operations, has asked you to help 'build a new dashboard' because 'the team can't see what's going on.' You have this conversation to find the real problem before building the wrong thing.",
  brief: "Dana wants a dashboard. Ask what actually happens today and what breaks, then decide what the real problem is and what to recommend.",
  character: { name: "Dana", persona: "Decisive, busy VP who is anchored on the dashboard idea and frames the problem in terms of that solution.", behavior: "You are not deceptive; you genuinely believe the dashboard is the fix and describe the world through that lens. You answer questions about what actually happens day to day accurately. When a question exposes that the real problem is upstream of a dashboard, you follow the logic honestly, though you keep returning to 'so we need better visibility.' You never hand over the root problem unprompted. 2 to 4 sentences, executive and impatient. No em dashes." },
  probes: { today: "Walk me through what actually happens today, step by step.", decision: "What decision would the dashboard change, and who makes it?", tried: "What have you already tried, and what happened?", measure: "How would we know it worked? What does success look like?", cost: "What breaks or costs money when this goes wrong today?" },
  verdict: [{ value: "process", label: "Real problem is an upstream process" }, { value: "dashboard", label: "A dashboard really is the fix" }, { value: "cant_tell", label: "Need more discovery" }],
  grading: "The real problem is hidden behind the client's proposed solution.",
  scenarios: [
    { id: "process", truth: "process", narrative: "The data exists but a two-day approval gate makes decisions late regardless; a dashboard would show the problem, not fix it.", tell: "By her own account the delay is a two-day approval gate, not missing visibility; a prior report changed nothing because the process, not the seeing, was the constraint.", foil: "She asked for a dashboard and has the data, so build the dashboard.",
      dims: { today: ["high", "hedge", "Orders come in, ops schedules them, but scheduling waits on a manual approval from finance that can take two days. Then we're behind."], decision: ["high", "hedge", "I guess the dashboard would tell us we're behind, but the decision that matters is the approval, and that's finance's call, not a screen."], tried: ["med", "hedge", "We tried a weekly report; people looked at it and nothing changed because the approval still gated everything."], measure: ["med", "affirm", "Success is orders going out on time. That's really it."], cost: ["high", "affirm", "Every late order risks the account; we lost two last quarter to slipped dates."] } },
    { id: "dashboard", truth: "dashboard", narrative: "Genuinely a visibility problem: decisions are fast once people can see, but the data is scattered across tools and goes stale.", tell: "Decisions are fast once people can see, the data exists but is scattered and stale, and the only fix they tried was a manual stitch. Here the dashboard really is the lever.", foil: "Consultants always say the real problem is process, so it can't be the dashboard.",
      dims: { today: ["high", "affirm", "Each team has its own tracker; to answer 'are we on track' someone spends an afternoon stitching spreadsheets, so we fly blind between those."], decision: ["high", "affirm", "The moment a lead sees a job slipping they reassign crews; today they just find out too late."], tried: ["med", "hedge", "We tried a manual weekly stitch; it's right for a day, then stale."], measure: ["med", "affirm", "Faster reallocation and fewer slipped jobs we could have caught."], cost: ["med", "affirm", "Slipped jobs we could have saved if someone had seen it Tuesday instead of Friday."] } },
    { id: "unclear", truth: "cant_tell", narrative: "Symptoms point at process, data, and definitions at once and success isn't defined; more discovery is the honest move.", tell: "The symptoms point at process, data, and definitions at once, and success isn't defined. The honest move is more discovery (shadow one order end to end) before committing to any build.", foil: "Just build the dashboard she asked for.",
      dims: { today: ["high", "hedge", "Honestly it depends who you ask; ops says it's late approvals, finance says ops data is wrong, and both have a point."], decision: ["high", "hedge", "I'm not sure a dashboard changes a specific decision; I mostly want to stop the finger-pointing."], tried: ["med", "hedge", "We've tried reports and meetings; neither stuck."], measure: ["med", "hedge", "I haven't defined success crisply, which is part of the problem."], cost: ["med", "hedge", "It's real but diffuse; nothing catastrophic, lots of friction."] } },
  ],
});

// ---- The Screening: assess a person behind a polished surface.
export const screeningSpec = (): ModuleSpec => makeRoleplay({
  slug: "the-screening", name: "The Screening", emoji: "👔", tagline: "See past a polished self-presentation to the strength or the risk underneath.", audience: "Hiring managers / recruiters / admissions", minutes: 18,
  goal: "Get past rehearsed stories by asking for specifics a polished candidate can't fake, then decide advance or pass without penalizing candor or rewarding smoothness.", aha: "The tell is often what a candidate can't produce: a real failure, a real conflict, a manager who'd take the call.",
  world: "You're hiring for a senior team lead. Jordan looks great on paper and interviews well. You have this conversation to decide whether to advance them. Strong candidates present a polished surface; your job is to find what's behind it, good or bad.",
  brief: "Jordan interviews well. Ask for specifics that a polished story can't fake, then decide: advance, pass, or need another round.",
  character: { name: "Jordan", persona: "Polished, warm, well-prepared candidate who tells tidy success stories and smooths over the rough parts.", behavior: "You never lie or invent accomplishments. A genuine strength you back with a specific, checkable example. A weakness or a rough departure you minimize, keep vague, and frame as growth; you never deny a direct specific question about it, but you don't volunteer it. Asked for a concrete failure or conflict, a strong candidate gives a real one and a weaker one stays generic. 2 to 4 sentences, composed and likeable. No em dashes." },
  probes: { failure: "Tell me about a real failure and what you actually changed.", conflict: "Walk me through a specific conflict and your part in it.", leaving: "Why are you leaving, really?", ownership: "Where did you take credit versus where was it the team?", reference: "Who would your last manager say you were, and would they rehire you?" },
  verdict: [{ value: "advance", label: "Advance" }, { value: "pass", label: "Pass" }, { value: "cant_tell", label: "Need another round" }],
  grading: "A strength or a risk is hidden behind a polished surface.",
  scenarios: [
    { id: "strong", truth: "advance", narrative: "Genuinely strong: specifics hold up, owns failures, clean departure, offers the reference.", tell: "Every hard question got a specific, self-implicating story; he named a real failure and a conflict he lost, and offered the reference unprompted. Polished and substantive.", foil: "He's smooth and confident, so he's either great or hiding something.",
      dims: { failure: ["high", "affirm", "I shipped a migration that took down billing for four hours. I owned it publicly, added a rollback gate, and we haven't had a Sev-1 in that system since."], conflict: ["high", "affirm", "A staff engineer and I disagreed on a rearchitecture; I was pushing too hard on timeline. I backed off, we ran a two-week spike, and his approach won. I was wrong."], leaving: ["med", "affirm", "My team got absorbed in a reorg and the scope shrank; I want to build again. My manager knows and supports the move."], ownership: ["med", "affirm", "The launch was the team's; my part was unblocking and taking the heat when it slipped. I try to name people specifically in reviews."], reference: ["high", "affirm", "She'd say I'm direct and reliable, and yes she'd rehire me in a heartbeat; happy to connect you."] } },
    { id: "risk", truth: "pass", narrative: "Takes credit, conflict-avoidant, left under a cloud; stays generic on every specific and steers the reference away from the manager.", tell: "He couldn't produce a real failure or a real conflict, redirected the reference away from his manager, and his 'weakness' was a humblebrag. The absence of a specific self-critical story was the tell.", foil: "No red flags came up and he's likeable, so advance.",
      dims: { failure: ["high", "hedge", "Good question. My biggest growth area is that I care almost too much; sometimes I take on too much myself."], conflict: ["high", "hedge", "I try to avoid conflict by aligning people early; I can't think of a big blow-up, I just head them off."], leaving: ["high", "hedge", "It was time for a new challenge; the fit had run its course, mutually."], ownership: ["med", "hedge", "I led the big launch last year; a real team effort of course, but I drove it."], reference: ["high", "noncommittal", "My manager and I had a complicated relationship; I'd point you to a peer instead who'd speak to my work."] } },
    { id: "mixed", truth: "cant_tell", narrative: "Real talent with one genuine, unresolved concern (peer friction); not resolvable in a single conversation.", tell: "Genuinely capable with one real, unresolved concern (the peer friction), and he was honest about it. Not a no, not an obvious yes; a second round on team fit is the disciplined call.", foil: "He admitted a weakness, so pass.",
      dims: { failure: ["high", "affirm", "I missed a deadline that cost a client; I owned it and changed how I estimate. That one still stings."], conflict: ["high", "hedge", "There was friction with a peer that I handled okay but not great; we never fully clicked."], leaving: ["med", "affirm", "A reorg cut my scope; straightforward."], ownership: ["med", "hedge", "Mostly good at crediting the team; I'll admit I've grabbed the mic once or twice."], reference: ["med", "hedge", "My manager would say strong but headstrong; rehire, probably, with a caveat about the peer thing."] } },
  ],
});

// ---- The Negotiation: uncover hidden interests and where the give is.
export const negotiationSpec = (): ModuleSpec => makeRoleplay({
  slug: "the-negotiation", name: "The Negotiation", emoji: "🤝", tagline: "Find where the other side actually has room before you ask for the wrong thing.", audience: "Anyone negotiating an offer or a deal", minutes: 18,
  goal: "Discover which levers a counterpart can actually move by probing each one, then push the right lever instead of the obvious one.", aha: "The counterpart won't announce their flexibility; the give is on the lever they won't shut down.",
  world: "You have a job offer and a call with Robin, the recruiter, to talk compensation. The company has some flexibility, but not everywhere, and Robin won't just tell you where. Your job is to find where the give is and ask for the right thing without torching goodwill.",
  brief: "Robin wants to close you. Find where the company actually has room by probing each lever, then decide which one to push.",
  character: { name: "Robin", persona: "Friendly, professional recruiter who wants to close you but protects the company's constraints and won't reveal the budget.", behavior: "You never lie about what is or isn't possible. Where there is real flexibility you can be moved by a specific, reasonable, justified ask, though you never advertise it. Where there is none you say so kindly but firmly and won't budge. You never reveal the internal budget or which levers are soft; the candidate discovers it by asking. A precise, well-justified ask on a flexible lever gets movement; a vague 'can you do better?' gets a soft deflection. 2 to 4 sentences, warm and closing-oriented. No em dashes." },
  probes: { base: "Is there room on base salary?", signing: "What about a signing bonus?", equity: "Can we move on equity?", startDate: "Is the start date flexible?", growth: "Is there a learning, development, or relocation budget?" },
  verdict: [{ value: "signing", label: "Push the signing bonus" }, { value: "base", label: "Push base salary" }, { value: "equity", label: "Push equity" }, { value: "cant_tell", label: "Not enough signal yet" }],
  grading: "Which levers have real give is hidden and the recruiter won't volunteer it.",
  scenarios: [
    { id: "signing", truth: "signing", narrative: "Base is banded and fixed, equity is fixed by level, but there's real room on a signing bonus (and the start date).", tell: "Base and equity were firmly banded (she said so plainly), but she softened and asked a follow-up on the signing bonus, which is where the give was. The tell was the one lever she wouldn't shut down.", foil: "Base is the biggest number, so push base.",
      dims: { base: ["high", "deny", "Base is set by the band for this level and I genuinely can't move it; that one's firm."], signing: ["high", "hedge", "A signing bonus is something I might have more room on, if there's a reason. What are you leaving on the table by moving?"], equity: ["high", "deny", "Equity is fixed to the level too; everyone at this level gets the same grant."], startDate: ["med", "hedge", "Start date I can be flexible on; that doesn't cost me anything."], growth: ["low", "affirm", "There's a standard development budget everyone gets; happy to confirm the number."] } },
    { id: "base", truth: "base", narrative: "They under-leveled the offer, so there is real room on base with a competing number, while signing and equity are locked.", tell: "She deflected signing and equity firmly but invited a competing number on base, the one place they had room (they'd under-leveled you). The give was on the least obvious lever.", foil: "Startups never move base, so push equity.",
      dims: { base: ["high", "hedge", "Base, let me ask. If you've got a competing number, that helps me make the case internally."], signing: ["high", "deny", "We don't really do signing bonuses here; that's not a lever I have."], equity: ["high", "deny", "Equity's fixed to level, no movement."], startDate: ["med", "affirm", "Start date's flexible, no problem."], growth: ["low", "affirm", "Standard development budget applies."] } },
    { id: "tight", truth: "cant_tell", narrative: "A genuinely tight, take-it-or-leave-it offer with little real give; you'd need outside leverage.", tell: "Every substantive lever was firm and even the signing bonus was a maybe. There's no clear give; the honest read is you need outside leverage (a competing offer) before this moves, not a cleverer question.", foil: "There's always room if you ask, so push hard on base.",
      dims: { base: ["high", "deny", "Base is firm, I'm sorry."], signing: ["med", "hedge", "I can ask about a small signing bonus but I wouldn't get your hopes up."], equity: ["high", "deny", "Equity's fixed."], startDate: ["low", "affirm", "Start date, sure, flexible."], growth: ["low", "affirm", "Standard budget, yes."] } },
  ],
});

// The whole library, keyed by slug, for BUILTIN_SPECS and the gallery.
export const LIBRARY_SPECS: Record<string, () => ModuleSpec> = {
  "the-diagnosis": diagnosisSpec,
  "the-diligence": diligenceSpec,
  "the-investigation": investigationSpec,
  "the-discovery": discoverySpec,
  "the-screening": screeningSpec,
  "the-negotiation": negotiationSpec,
};

// Gallery metadata: the general TYPE each template teaches.
export const LIBRARY_TEMPLATES = [
  { id: "the-diagnosis", name: "The Diagnosis", emoji: "🩺", domain: "Ops · root-cause", whenToUse: "Symptoms are reported but the cause is hidden and the informant guesses wrong. Medicine, incidents, quality, org dysfunction.", make: diagnosisSpec },
  { id: "the-diligence", name: "The Diligence", emoji: "🔬", domain: "Investing · go / no-go", whenToUse: "Vet a pitch or claim when the other side spins the weak spots. VC, procurement, M&A, grant review.", make: diligenceSpec },
  { id: "the-investigation", name: "The Investigation", emoji: "🕵️", domain: "Management · what happened", whenToUse: "Reconstruct events from someone with a stake. HR complaints, incident reviews, journalism, compliance.", make: investigationSpec },
  { id: "the-discovery", name: "The Discovery", emoji: "🧭", domain: "Consulting · real problem", whenToUse: "The client arrives with a solution; find the real problem. Consulting, product, sales discovery, UX research.", make: discoverySpec },
  { id: "the-screening", name: "The Screening", emoji: "👔", domain: "Hiring · assess a person", whenToUse: "See past a polished self-presentation to the strength or risk. Interviews, admissions, casting, credit.", make: screeningSpec },
  { id: "the-negotiation", name: "The Negotiation", emoji: "🤝", domain: "Negotiation · find the give", whenToUse: "Discover where a counterpart actually has room before you ask. Salary, procurement, partnerships, disputes.", make: negotiationSpec },
] as const;
