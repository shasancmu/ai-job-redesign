"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson2Choose({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="How to tell which program is good" topic="judging a PhD program: why placement predicts your outcome, how to read a placement record in your subfield, faculty fit and active advising, funding and support, culture and cohort, and why placement beats prestige">
      <p>Rankings and prestige are noisy. There&apos;s one signal that predicts your outcome far better, and once you see why, you&apos;ll read program pages differently.</p>

      <LessonPredict
        prompt="What's the single best signal of a good PhD program?"
        choices={[
          "Its overall university ranking",
          "Where its graduates actually get jobs (its placement record)",
          "How famous its most senior professor is",
        ]}
        answer={1}
        reveal="Placement. Where a program's students land is the sharpest predictor of where you'll land. Top programs place graduates at top departments, because research-active faculty train students who carry their approach to the frontier, and getting there means convincing another school to make a multi-million-dollar bet on the student."
      />

      <H2>Why placement predicts <em>your</em> outcome</H2>
      <p>Placement is a causal chain, not just a scoreboard. Research-active faculty work on frontier problems; students who apprentice under them learn to work at that frontier and inherit the network and the standards. When those students go on the market, their advisors&apos; letters and reputations vouch for them. So a strong placement record is <em>evidence the whole machine works</em>: good problems → good training → strong letters → good jobs. A program that hasn&apos;t placed well recently, whatever its brand, is telling you the machine is sputtering.</p>

      <H2>How to actually read a placement page</H2>
      <p>Don&apos;t just glance at the best outcome. Read it like an analyst:</p>
      <p><strong>Look at your subfield.</strong> A finance powerhouse can be mediocre in marketing or strategy. Placement is area-specific: find the students who did work like yours and see where <em>they</em> went.</p>
      <p><strong>Look at recent years.</strong> Faculty move and fields cool; a great record from a decade ago may be stale. Weight the last three to five years.</p>
      <p><strong>Look at the whole distribution, not the star.</strong> One superstar placement can mask a weak median. Ask where the <em>typical</em> graduate lands, and where the weaker ones do. That tells you the floor you&apos;re buying.</p>

      <LessonPredict
        prompt="A program's website leads with one graduate who landed at Harvard. What should you check before being impressed?"
        choices={[
          "Nothing: that placement proves it's a top program",
          "Whether that's typical: recent years, your subfield, and where the median graduate lands",
          "The professor's h-index",
        ]}
        answer={1}
        reveal="Whether it's typical. A single star placement can be an outlier: a superstar student, an old year, or a different subfield. The median outcome in your area over the last few years is the real signal. Read the distribution, not the headline."
      />

      <H2>Then, in order</H2>
      <p><strong>Faculty fit.</strong> Are there <em>research-active</em> professors in <em>your</em> area who could advise you and put their name behind you? &ldquo;Active&rdquo; matters: a famous name who no longer publishes or takes students can&apos;t train you or write the letter that moves a committee. Check who has placed students recently, not just who is on the roster.</p>
      <p><strong>Funding &amp; support.</strong> Five to six years guaranteed, plus real 1:1 mentoring and a travel/research budget. The program is investing heavily in you; you want one that backs it with time and money, not just admission.</p>
      <p><strong>Culture &amp; cohort.</strong> The people you&apos;ll learn alongside, and whether the place is collaborative or cut-throat, shapes six years of your life. A generous, talk-attending, door-open culture compounds; an isolating one quietly starves you (more on that in the success lesson).</p>

      <Note>Read the placement page (in your subfield, in recent years, at the median) before the ranking. A program that reliably places students like you, with an active advisor who&apos;ll fight for you, beats a more famous name that doesn&apos;t.</Note>
    </LessonShell>
  );
}
