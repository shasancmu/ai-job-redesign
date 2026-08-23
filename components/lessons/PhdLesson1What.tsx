"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson1What({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Is a business PhD for you?" topic="what a business PhD actually is, research training to become a professor, its two products, the funded apprenticeship, and whether it fits you">
      <p>Before anything else, it helps to be clear-eyed about what a business PhD <em>is</em>, because a lot of people apply for the wrong reasons.</p>

      <LessonPredict
        prompt="A business PhD is mainly…"
        choices={[
          "An advanced MBA, a credential for a better industry job",
          "Research training to become a professor who produces knowledge",
          "A few years to figure out what you want to do",
        ]}
        answer={1}
        reveal="Research training to become a professor. A PhD is not an MBA and not a general credential, it's an apprenticeship in producing knowledge. If your goal is an industry job, a PhD is a slow and costly detour."
      />

      <H2>What the job actually is</H2>
      <p>A professor does two things: <strong>teach</strong> and <strong>research</strong>. And research has two tangible products, <strong>papers and presentations</strong>. That's the output. A PhD is five to six years learning to make it: it's a <strong>funded apprenticeship</strong> (the school invests roughly $300k in you), not a course of study you pay for.</p>

      <H2>The honest part</H2>
      <p>The path is long and the odds are humbling, as you'll see, publishing is close to a lottery. So the people who thrive are the ones who genuinely want to <em>do the research</em>, not the ones who want the title. If the daily work of asking a question and grinding out an answer sounds like a slog rather than a pull, that's worth knowing now.</p>

      <Note>So the real question isn't &ldquo;can I get in?&rdquo; It's &ldquo;do I actually want to spend six years producing research?&rdquo; If yes, the rest of this series is your map: how to pick a program, how to get in, how it works, how to succeed, and how to land a job.</Note>
    </LessonShell>
  );
}
