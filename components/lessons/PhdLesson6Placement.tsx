"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson6Placement({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Landing a good academic job" topic="the academic job market: the job-market paper as the calling card, the Important/Interesting/Ambitious test with examples, the pipeline as evidence of drive, the packet, the job talk, and targeting the right schools">
      <p>The whole PhD funnels into one thing: the job market. And the job market funnels into one thing: your <strong>job-market paper</strong>. Everything else in the packet exists to support it.</p>

      <H2>The bet, again</H2>
      <p>A hiring department is making a <strong>$2–2.5M</strong> bet on you — salary, research budget, space, service, over the years to tenure. Your JMP is the evidence they weigh. It doesn&apos;t just need to be right; it needs to make a committee believe you&apos;re worth that bet. That comes down to three tests.</p>

      <LessonPredict
        prompt="What makes a job-market paper land a top job?"
        choices={[
          "It's competent and correct",
          "It's Important, Interesting, and Ambitious",
          "It has the most citations of prior work",
        ]}
        answer={1}
        reveal="Important, Interesting, and Ambitious. Competent-and-correct is the floor, not the bar. A paper that wins a top job solves a problem adults care about (Important), is novel and non-obvious enough to sustain a long debate (Interesting), and is something very few people could have done, rare data, skill, or creativity (Ambitious)."
      />

      <H2>The three tests, concretely</H2>
      <p><strong>Important — do adults care?</strong> It speaks to a real, pressing problem people outside a narrow subfield would recognize as mattering — not just &ldquo;a gap in the literature.&rdquo; The test: can you state, in one sentence a dean would nod at, why the answer matters?</p>
      <p><strong>Interesting — is it deep and non-obvious?</strong> A finding people would <em>bet against</em> before seeing your evidence, or a mechanism that reframes how they think, is interesting. One that merely confirms the obvious isn&apos;t, however cleanly executed. Interesting work sustains a long conversation — and a long conversation is what builds a career.</p>
      <p><strong>Ambitious — could hardly anyone else have done it?</strong> Rare data you assembled, a hard method you mastered, a creative design others missed. Ambition is the moat: it&apos;s what makes a committee <em>excited</em> rather than merely satisfied, because it signals a scholar who will keep doing things others can&apos;t.</p>

      <H2>The rest of the packet</H2>
      <p>The JMP proves quality (E[p]); a <strong>pipeline</strong> of other projects proves you&apos;ll keep producing (E[n]) — one great paper could be luck, a pipeline says it wasn&apos;t. Then the supporting cast: a clean CV, research and teaching statements, and <strong>references</strong> who vouch that you&apos;ll succeed (the same E[p]/E[n] bet, in a senior scholar&apos;s voice).</p>

      <H2>The job talk and targeting</H2>
      <p><strong>The job talk</strong> is where the bet is won or lost in the room. A great paper with a muddled talk loses; the talk has to make the importance land in the first two minutes, survive tough questions with composure, and leave a roomful of skeptics convinced. Rehearse it more than you think you need to.</p>
      <p><strong>Targeting.</strong> Apply where your <em>level and fit</em> match — schools whose recent hires look like you, in areas with faculty who&apos;ll champion your work. Aiming only at the very top wastes the year; aiming too low undersells you. Calibrate to the market you&apos;re actually in.</p>

      <LessonPredict
        prompt="Your JMP is flawless — rigorous, correct, cleanly executed — but reviewers keep saying 'so what?' What's missing?"
        choices={[
          "More robustness checks",
          "Importance and/or ambition — competence is the floor, not the bar",
          "A higher-ranked target school",
        ]}
        answer={1}
        reveal="Importance and ambition. 'So what?' means it passed the correctness floor but failed Important and Interesting. More robustness checks won't fix a question nobody cares about. Fix the question — why it matters and why it's hard — before polishing the execution. That's the thing that turns a satisfied committee into an excited one."
      />

      <Note>Work backward from the bet. If your JMP isn&apos;t yet Important, Interesting, and Ambitious, that&apos;s the thing to fix — everything else in the packet, and the whole PhD before it, exists to support one paper that clears those three tests.</Note>
    </LessonShell>
  );
}
