"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson4Structure({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="How a PhD is structured" topic="the phases of a business PhD, coursework and comps, the qualifying paper and finding an advisor, the research pipeline, the job-market paper, and the job market, and what each phase is for">
      <p>A PhD isn't one long block, it's a series of phases, each with a different job. Knowing which phase you're in tells you what to optimize.</p>

      <H2>The phases</H2>
      <div className="not-prose space-y-2">
        <Milestone year="Yr 1–2">Coursework &amp; comps, build your methods and theory toolkit, and pass the comprehensive/qualifying exams.</Milestone>
        <Milestone year="Yr 2–3">The qualifying paper &amp; an advisor, your first real research, and the point you find a faculty mentor.</Milestone>
        <Milestone year="Yr 3–4">The research pipeline, multiple projects going at once, developing the dissertation.</Milestone>
        <Milestone year="Yr 4–5">The job-market paper, the single best paper that becomes your calling card.</Milestone>
        <Milestone year="Yr 5–6">The job market, applications, the job talk, fly-outs, and placement.</Milestone>
      </div>

      <p>Each phase has a purpose: coursework builds the toolkit; the qualifying paper proves you can do research at all; the job-market paper proves you can do it at the level a top department will bet on.</p>

      <LessonPredict
        prompt="Of everything in a PhD, what are you ultimately hired on?"
        choices={["Your GPA in coursework", "Your job-market paper", "The number of papers you started"]}
        answer={1}
        reveal="Your job-market paper. Coursework and comps are gates you pass through; the JMP is the product departments actually evaluate. Everything in the middle years is really preparation to make one paper that's good enough to be your calling card."
      />

      <Note>Wherever you are, ask: what is <em>this</em> phase for, and what's the next milestone, an advisor, a first submission, the JMP? Optimize for that, not for looking busy.</Note>
    </LessonShell>
  );
}
