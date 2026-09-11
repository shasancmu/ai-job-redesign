"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson4Structure({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="How a PhD is structured" topic="the phases of a business PhD: coursework and comps, the qualifying paper and finding an advisor, building a research pipeline, the job-market paper, and the job market, what each phase is for and the failure mode of each">
      <p>A PhD is a series of phases, each with a different job, not one long block. Knowing which phase you&apos;re in tells you what to optimize, and (just as usefully) what to <em>stop</em> optimizing.</p>

      <H2>The phases</H2>
      <div className="not-prose space-y-2">
        <Milestone year="Yr 1–2">Coursework &amp; comps: build your methods and theory toolkit, and pass the comprehensive/qualifying exams.</Milestone>
        <Milestone year="Yr 2–3">The qualifying paper &amp; an advisor: your first real research, and the point you find a faculty mentor.</Milestone>
        <Milestone year="Yr 3–4">The research pipeline: multiple projects going at once, developing the dissertation.</Milestone>
        <Milestone year="Yr 4–5">The job-market paper: the single best paper that becomes your calling card.</Milestone>
        <Milestone year="Yr 5–6">The job market: applications, the job talk, fly-outs, and placement.</Milestone>
      </div>

      <H2>What each phase is really for</H2>
      <p><strong>Coursework &amp; comps</strong> build the toolkit: the methods and theory you&apos;ll use for the rest of your career. The trap: treating it like a degree to ace. Straight A&apos;s in coursework predict almost nothing about your job. Learn the tools, pass the gate, and get to research as fast as you can.</p>
      <p><strong>The qualifying paper</strong> proves you can do research <em>at all</em>: it&apos;s your proof of concept, and the vehicle for finding an advisor who&apos;ll invest in you. The trap: waiting for the perfect idea. A finished, imperfect paper teaches you more and signals more than a perfect unfinished one.</p>
      <p><strong>The pipeline</strong> is where you stop being a student and start being a producer. You want <em>several</em> projects alive at once, because research is a lottery (from the last lesson): a portfolio of bets, not one. It hedges risk and it&apos;s the evidence of drive (E[n]) that hiring committees look for.</p>
      <p><strong>The job-market paper (JMP)</strong> is the one project you polish to a shine: the single thing departments actually evaluate. Everything before it is preparation to make one paper good enough to be your calling card.</p>
      <p><strong>The job market</strong> is where all of it is priced. More on that in the placement lesson.</p>

      <LessonPredict
        prompt="Of everything in a PhD, what are you ultimately hired on?"
        choices={["Your GPA in coursework", "Your job-market paper", "The number of papers you started"]}
        answer={1}
        reveal="Your job-market paper. Coursework and comps are gates you pass through; the JMP is the product departments actually evaluate. Everything in the middle years is really preparation to make one paper that's good enough to be your calling card."
      />

      <LessonPredict
        prompt="It's your third year. What's the smartest way to spend it?"
        choices={[
          "Push one perfect paper and ignore everything else",
          "Keep several projects alive while one rises toward the JMP",
          "Take more coursework to raise your GPA",
        ]}
        answer={1}
        reveal="Run a pipeline. One paper is a single lottery ticket. If it stalls, you've lost a year. Several live projects hedge that risk, and the strongest one becomes your JMP while the others become the pipeline that proves you'll keep producing. More coursework in year three is optimizing the wrong phase."
      />

      <Note>Wherever you are, ask: what is <em>this</em> phase for, and what&apos;s the next milestone: an advisor, a first submission, the JMP? Optimize for that, not for looking busy or acing the phase you&apos;re already past.</Note>
    </LessonShell>
  );
}
