"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";
import PhdBetDemo from "@/components/lessons/PhdBetDemo";

export default function PhdLesson3Apply({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Getting in, from the committee's side" topic="PhD admissions from the committee's seat: the ~$300k bet that you'll become a researcher who publishes, why publishing is a lottery, signaling high E[p] (quality) and E[n] (drive), each signal ranked, and the common mistakes">
      <p>The fastest way to write a strong application is to stop thinking about <em>you</em> and start thinking about the <strong>committee&apos;s problem</strong>. Once you see what they&apos;re deciding, what to put in the packet becomes obvious.</p>

      <H2>What they&apos;re actually deciding</H2>
      <p>Admitting you costs the school roughly <strong>$300k</strong> (stipend, tuition, years of 1:1 faculty time). They&apos;re making a bet: that you&apos;ll become a researcher who publishes 5–6 papers and earns tenure. But top journals accept only <strong>3–7%</strong> of submissions, so publishing is a <strong>lottery</strong>. The odds of five acceptances in five tries are basically zero.</p>

      <PhdBetDemo />

      <p>So the bet only pays off for a candidate who is <strong>high on both</strong> dimensions: quality (<strong>E[p]</strong> — can genuinely do good work, so each attempt has a real shot) and drive (<strong>E[n]</strong> — will keep taking attempts, because volume is how you beat a lottery). A brilliant candidate who quits after two rejections fails; a relentless one whose work is mediocre fails too. You need the product of the two to be high. <em>Everything</em> in your application is read as evidence of these two things.</p>

      <LessonPredict
        prompt="Which single item best signals your research ability (E[p]) to a committee?"
        choices={["Your GPA", "A strong writing sample / working paper", "A high test score"]}
        answer={1}
        reveal="A strong writing sample or working paper. Grades and scores are weak, noisy signals of whether you can do research. Actual research, an RA project, a working paper, a sharp writing sample, is the best evidence that you can do the thing they're betting on."
      />

      <H2>How to signal both — in rough order of weight</H2>
      <p><strong>Research experience (E[p], heaviest).</strong> An RA-ship with a professor, a working paper, a thesis, a sharp writing sample that frames a question and argues it. This is the closest thing to a demo of the job itself, so it dominates.</p>
      <p><strong>Letters from researchers (both).</strong> A letter from someone who <em>does research</em> and can say &ldquo;this person will become a productive scholar&rdquo; outweighs a glowing letter from someone who only saw you get an A. The writer&apos;s credibility is part of the signal.</p>
      <p><strong>Quantitative / methods preparation (E[p]).</strong> Math, statistics, coding — evidence you can handle the tools of modern research and won&apos;t wash out of coursework.</p>
      <p><strong>A statement that thinks like a researcher (both).</strong> Not &ldquo;I&apos;ve always loved business,&rdquo; but a real question, why it matters, and why <em>this</em> department. It should read like a junior colleague&apos;s, not an applicant&apos;s.</p>
      <p><strong>Fit (drive + realism).</strong> Name specific faculty whose work you actually know and could work with. It signals you understand what you&apos;re signing up for.</p>
      <p><strong>Track record of finishing hard things (E[n]).</strong> Evidence you persist — because persistence is half the bet.</p>

      <LessonPredict
        prompt="You're clearly brilliant (high E[p]) but your record shows you often start things and drop them. What does the committee worry about, and what should you fix?"
        choices={[
          "Nothing — brilliance is all that matters",
          "Your drive (E[n]); shore up evidence that you finish and persist before applying",
          "Your test scores",
        ]}
        answer={1}
        reveal="They worry you won't survive the lottery. Quality with no persistence produces two great unfinished papers and no tenure case. Show a completed research project, a shipped working paper — evidence you finish. Always shore up the weaker of your two signals; that's the one the committee will use to say no."
      />

      <H2>Common mistakes</H2>
      <p>Applicants sabotage themselves in predictable ways: leaning on grades and scores (weak signals) instead of research; a generic statement that could be sent anywhere; letters from managers or lecturers rather than researchers; and no visible evidence they can <em>finish</em>. Each one reads, to the committee, as an unanswered question about the bet.</p>

      <Note>Reframe every piece of the application as an answer to their question: &ldquo;does this person clear the bar for the bet?&rdquo; The weakest of your two signals — quality or drive — is the one to shore up before you apply.</Note>
    </LessonShell>
  );
}
