"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson1What({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Is a business PhD for you?" topic="what a business PhD actually is: research training to become a professor, the two products (papers and presentations), the funded apprenticeship and its economics, the opportunity cost, and whether the daily work fits you">
      <p>Before anything else, it helps to be clear-eyed about what a business PhD <em>is</em>, because a lot of people apply for the wrong reasons — and a wrong reason is expensive when the commitment is five or six years.</p>

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
      <p>A professor does two things: <strong>teach</strong> and <strong>research</strong>. Teaching is the visible half; research is the half that determines your career. And research has two tangible products: <strong>papers and presentations</strong>. That is the output — new knowledge, written down and defended in front of peers. Everything else (grades, seminars, methods) is machinery for making those two things.</p>
      <p>What is &ldquo;research,&rdquo; concretely? It&apos;s asking a question <em>no one yet knows the answer to</em>, and producing a credible answer the field will accept. Not summarizing what&apos;s known — <strong>adding to it</strong>. That&apos;s a different skill from being an excellent student, which is one reason great students sometimes struggle and unusual ones thrive.</p>

      <H2>A funded apprenticeship, not a degree you buy</H2>
      <p>Unlike an MBA, you don&apos;t pay for a PhD — the school <strong>pays you</strong>. Between a stipend, tuition waiver, and years of one-on-one faculty time, a program invests roughly <strong>$300k</strong> in each student. Sit with that: they are not enrolling you, they are <em>hiring an apprentice</em> and betting the apprentice becomes a productive researcher. That single fact reframes admissions, which is the next lesson — you&apos;re not being graded, you&apos;re being underwritten.</p>

      <H2>The real cost</H2>
      <p>The tuition is free; the <strong>opportunity cost</strong> is not. Five to six years at a modest stipend means forgoing years of an industry salary — often several hundred thousand dollars in the aggregate — plus the compounding of that career you didn&apos;t start. A PhD can absolutely be worth it, but only if you want the <em>destination</em>, not just to avoid choosing one.</p>

      <H2>The honest part</H2>
      <p>The path is long and the odds are humbling. As you&apos;ll see, publishing in top journals is close to a lottery, and much of the daily work is slow, uncertain, and solitary — a question that resists you for months, a rejection after a year of effort. So the people who thrive are the ones who genuinely want to <em>do the research</em>, not the ones who want the title. If asking a hard question and grinding out an answer sounds like a <em>pull</em> rather than a slog, that&apos;s the best sign there is.</p>

      <LessonPredict
        prompt="Which candidate is most likely to thrive in a PhD and after?"
        choices={[
          "The one with the highest test scores and GPA",
          "The one genuinely pulled by the daily work of research, even when it's slow and uncertain",
          "The one most eager for the prestige of the title",
        ]}
        answer={1}
        reveal="The one pulled by the work. Scores get you in the door but don't sustain six years of uncertainty and rejection. Wanting the title fades the first time a paper is rejected after a year of effort. Genuine interest in the questions is what carries people through the grind — it's both the entry filter and the survival trait."
      />

      <Note>So the real question isn&apos;t &ldquo;can I get in?&rdquo; It&apos;s &ldquo;do I actually want to spend six years producing research?&rdquo; If yes, the rest of this series is your map: how to pick a program, how to get in, how it works, how to succeed, and how to land a job.</Note>
    </LessonShell>
  );
}
