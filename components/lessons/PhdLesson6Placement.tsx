"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson6Placement({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Landing a good academic job" topic="the academic job market: the job-market paper as the calling card, the Important/Interesting/Ambitious test, the pipeline behind it, and the packet, talk, and targets">
      <p>The whole PhD funnels into one thing: the job market. And the job market funnels into one thing: your <strong>job-market paper</strong>.</p>

      <H2>The bet, again</H2>
      <p>A hiring department is making a <strong>$2–2.5M</strong> bet on you (salary, research budget, space, over years). Your JMP is the evidence. It has to signal you're worth that bet, which comes down to three tests.</p>

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

      <H2>The three tests</H2>
      <p><strong>Important</strong>, do adults care? It solves a real, pressing problem, not just a gap in a niche literature. <strong>Interesting</strong>, is it deep and non-obvious enough to sustain a long conversation? <strong>Ambitious</strong>, could hardly anyone else have done this? That's what makes a committee excited rather than merely satisfied.</p>

      <H2>The rest of the packet</H2>
      <p>The JMP proves quality (E[p]); a <strong>pipeline</strong> of other projects proves you'll keep producing (E[n]). Then the supporting cast: a clean CV, research and teaching statements, <strong>references</strong> who vouch that you'll succeed, a <strong>job talk</strong> that lands, and <strong>targeting</strong> the schools where your fit and level are right.</p>

      <Note>Work backward from the bet. If your JMP isn't yet Important, Interesting, and Ambitious, that's the thing to fix, everything else in the packet supports it.</Note>
    </LessonShell>
  );
}
