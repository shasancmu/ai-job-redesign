import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, regressionFeedbackAI } from "@/lib/ai";
import { unsealDgp } from "@/lib/regsim/seal";
import { simulate } from "@/lib/regsim/simulate";
import { gradeSubmission } from "@/lib/regsim/grade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Grade a submission. The sealed answer key (from the client's workspace) is
// unsealed server-side, the data is re-simulated deterministically from it (so we
// never trust client-sent numbers), scored objectively, then the AI adds
// qualitative feedback on the write-up. The true model is revealed only now.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const dgp = unsealDgp(String(body.sealed || ""));
  if (!dgp) return Response.json({ error: "This challenge's answer key is missing or invalid. Start a new challenge." }, { status: 400 });

  const formula = String(body.formula || "").trim().slice(0, 400);
  const writeup = String(body.writeup || "").trim().slice(0, 6000);
  if (!formula) return Response.json({ error: "Submit a model formula, e.g. y ~ x1 + log(x2)." }, { status: 400 });
  setFlow("regression:grade");

  try {
    const { columns } = simulate(dgp);
    const grade = gradeSubmission(dgp, columns, formula);

    let feedback: any = null;
    if (AI_ENABLED) {
      feedback = await regressionFeedbackAI({
        context: dgp.context,
        scenario: dgp.scenario,
        trueModel: grade.trueModel,
        studentModel: grade.studentModel,
        writeup,
        breakdown: { score: grade.score, correct: grade.correct, missed: grade.missed, extra: grade.extra },
      }).catch(() => null);
    }

    return Response.json({ grade, feedback });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to grade the submission." }, { status: 500 });
  }
}
