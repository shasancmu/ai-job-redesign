"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";
import PhdBetDemo from "@/components/lessons/PhdBetDemo";

export default function PhdLesson3Apply({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Getting in — from the committee's side" topic="PhD admissions seen from the committee's seat: the ~$300k bet that you'll become a researcher who publishes, and how to signal high E[p] (quality) and E[n] (drive)">
      <p>The fastest way to write a strong application is to stop thinking about <em>you</em> and start thinking about the <strong>committee's problem</strong>.</p>

      <H2>What they're actually deciding</H2>
      <p>Admitting you costs the school roughly <strong>$300k</strong> (stipend, tuition, years of 1:1 faculty time). They're making a bet: that you'll become a researcher who publishes 5–6 papers and earns tenure. But top journals accept only 3–7% of papers, so publishing is a <strong>lottery</strong>. The odds of five acceptances in five tries are basically zero.</p>

      <PhdBetDemo />

      <p>So the bet only pays off for a candidate who is <strong>high on both</strong>: quality (<strong>E[p]</strong> — can genuinely do good work) and drive (<strong>E[n]</strong> — will keep writing). Everything in your application is read as evidence of these two things.</p>

      <LessonPredict
        prompt="Which single item best signals your research ability (E[p]) to a committee?"
        choices={["Your GPA", "A strong writing sample / working paper", "A high test score"]}
        answer={1}
        reveal="A strong writing sample or working paper. Grades and scores are weak, noisy signals of whether you can do research. Actual research — an RA project, a working paper, a sharp writing sample — is the best evidence that you can do the thing they're betting on."
      />

      <H2>How to signal both</H2>
      <p><strong>E[p] (quality):</strong> real research experience — an RA-ship, a working paper, and especially a writing sample that shows you can frame a question and argue it. <strong>E[n] (drive):</strong> a track record of finishing hard things, and quantitative/methods prep (math, coding, statistics). <strong>Letters</strong> from <em>researchers</em> who can speak to your potential, not just your grades. A <strong>statement</strong> that shows you think like a researcher — a real question and why it matters. And <strong>fit</strong>: specific faculty whose work you know.</p>

      <Note>Reframe every piece of the application as an answer to their question: &ldquo;does this person clear the bar for the bet?&rdquo; The weakest of your two signals — quality or drive — is the one to shore up before you apply.</Note>
    </LessonShell>
  );
}
