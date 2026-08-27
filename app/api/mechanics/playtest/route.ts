import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, simulateRunAI, roleplayExaminerAI } from "@/lib/ai";
import { characterSystem, examinerPrompt, type ModuleSpec } from "@/lib/mechanics/roleplay";
import { characterRole } from "@/lib/mechanics/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SIM_SYSTEM = `You are playtesting an interrogation training module by simulating one realistic run. You will produce a transcript of a learner questioning an AI character, then the learner's final verdict. Two hard rules: (1) the CHARACTER must obey its briefing exactly, including never stating a falsehood and hedging or declining where the briefing says so; it must NOT hand over the hidden answer. (2) The LEARNER behaves exactly as the persona describes, no better and no worse. Keep each turn to 1-3 sentences. Output ONLY JSON.`;

// Run a strong and a weak simulated learner through the module, grade both with
// the real examiner, and report whether the rubric actually separates them.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const spec = body.spec as ModuleSpec;
  if (!spec || !spec.scenarios?.length) return Response.json({ error: "The module needs at least one scenario to playtest." }, { status: 400 });
  const role = characterRole(spec);
  if (!role || !spec.rubric) return Response.json({ error: "The module needs a character and a rubric to playtest." }, { status: 400 });
  setFlow("mechanics:playtest");

  // Prefer a scenario with a real, findable tell (not the genuinely ambiguous one).
  const scn = spec.scenarios.find((s) => !/cant|can.t|ambig|unclear|unsure/i.test(`${s.truth} ${s.id}`)) || spec.scenarios[0];
  const conv = (spec.flow || []).find((f) => f.kind === "converse");
  const budget = conv?.budget || 6;
  const verdictStep = (spec.flow || []).find((f) => f.kind === "verdict");
  const choice = (verdictStep?.verdict || []).find((f) => f.type === "choice");
  const options = (choice?.options || []).map((o) => o.value).filter(Boolean);
  const charSys = characterSystem(spec, role, scn);

  async function runPersona(kind: "strong" | "weak") {
    const persona = kind === "strong"
      ? "an excellent, well-prepared analyst who asks the highest-value, most specific and diagnostic questions, listens hard for what the character will NOT say, and ends with a well-calibrated verdict"
      : "a weak, underprepared learner who asks vague, open, or leading questions, takes the character's spin at face value, misses the tell, and ends overconfident";
    const userMsg = [
      `CHARACTER BRIEFING (the character obeys this exactly):`,
      charSys,
      ``,
      `THE SITUATION shown to the learner:`,
      spec.world || "(none)",
      ``,
      `Simulate ${budget} questions from ${persona}. Then the learner commits a verdict.`,
      options.length ? `The verdict "call" must be one of: ${options.join(", ")}.` : ``,
      `Output JSON: {"transcript":"LEARNER: ...\\nCHARACTER: ...\\n...","call":"<value>","confidence":<0-100 integer>,"flip":"<one fact that would change the call>"}`,
    ].join("\n");
    const sim = await simulateRunAI(SIM_SYSTEM, userMsg);
    if (!sim?.transcript) return null;
    const verdict = { call: sim.call, confidence: sim.confidence, flip: sim.flip };
    const { system, user: gu } = examinerPrompt(spec, scn, String(sim.transcript), verdict);
    const report = await roleplayExaminerAI(system, gu);
    return { transcript: String(sim.transcript), verdict, report };
  }

  try {
    const [strong, weak] = await Promise.all([runPersona("strong"), runPersona("weak")]);
    if (!strong || !weak) return Response.json({ error: "The playtest couldn't complete. Try again." }, { status: 502 });

    const sScore = Number(strong.report?.score) || 0;
    const wScore = Number(weak.report?.score) || 0;
    const sRight = !!strong.report?.verdict_correct;
    const separates = sScore - wScore >= 15 && sRight;
    const note = separates
      ? "The rubric distinguishes strong questioning from weak. The module works as designed."
      : !sRight
        ? "Even a strong questioner couldn't reach the right call. The tell may be too buried, or the scenario under-specified. Sharpen the answers or the brief."
        : "Strong and weak runs scored too close. The module may not reward good questioning enough. Make the high-value probes more decisive, or the rubric more discriminating.";

    return Response.json({
      scenario: { id: scn.id, truth: scn.truth },
      budget,
      separates, note,
      strong: { score: sScore, correct: sRight, verdict: strong.verdict, report: strong.report, transcript: strong.transcript },
      weak: { score: wScore, correct: !!weak.report?.verdict_correct, verdict: weak.verdict, report: weak.report, transcript: weak.transcript },
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Playtest failed." }, { status: 500 });
  }
}
