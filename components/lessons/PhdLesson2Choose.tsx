"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson2Choose({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="How to tell which program is good" topic="judging a PhD program: placement above all, then faculty fit in your area, funding, and culture — and why placement beats prestige">
      <p>Rankings and prestige are noisy. There's one signal that predicts your outcome far better.</p>

      <LessonPredict
        prompt="What's the single best signal of a good PhD program?"
        choices={[
          "Its overall university ranking",
          "Where its graduates actually get jobs (its placement record)",
          "How famous its most senior professor is",
        ]}
        answer={1}
        reveal="Placement. Where a program's students land is the sharpest predictor of where you'll land. Top programs place graduates at top departments, because research-active faculty train students who carry their approach to the frontier — and getting there means convincing another school to make a multi-million-dollar bet on the student."
      />

      <H2>Then, in order</H2>
      <p><strong>Faculty fit.</strong> Are there research-active professors in <em>your</em> area who could advise you and put their name behind you? An advisor who publishes and champions students is worth more than a big brand.</p>
      <p><strong>Funding &amp; support.</strong> Five to six years guaranteed, plus real 1:1 mentoring — the program is investing heavily in you, and you want one that backs it up.</p>
      <p><strong>Culture &amp; cohort.</strong> The people you'll learn alongside, and whether the place is collaborative or cut-throat, shapes six years of your life.</p>

      <Note>Read the placement page before the ranking. A program that reliably places students in your area, with an advisor who'll fight for you, beats a more famous name that doesn't.</Note>
    </LessonShell>
  );
}
