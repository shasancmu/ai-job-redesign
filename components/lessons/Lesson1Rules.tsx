"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import RuleFlowDemo from "@/components/lessons/RuleFlowDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson1Rules({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="When humans wrote the logic" topic="the rules era of AI: expert systems, decision support systems, and the knowledge-acquisition bottleneck that stopped them">
      <p>For its first few decades, &ldquo;artificial intelligence&rdquo; meant something very concrete: a person sat down and <strong>wrote the rules by hand</strong>. If the AI seemed smart, it was because a human had painstakingly encoded what to do in every situation they could think of.</p>

      <H2>Expert systems</H2>
      <p>The flagship idea was the <strong>expert system</strong>: interview a human expert, turn their knowledge into hundreds of IF-THEN rules, and let the computer follow them like a giant flowchart.</p>
      <Milestone year="1976">MYCIN, at Stanford, used about 600 hand-written rules to diagnose blood infections and recommend antibiotics — and it performed comparably to specialists.</Milestone>

      <RuleFlowDemo />

      <H2>Decision support systems</H2>
      <p>Alongside expert systems sat <strong>decision support systems</strong> — tools that combined data and models to help a person decide (a loan officer, a manager, a doctor). The common thread with expert systems: <em>a human supplied the logic</em>, and the machine executed it faithfully.</p>

      <LessonPredict
        prompt="These systems worked. So what was the limitation that eventually stopped them?"
        choices={[
          "Computers weren't fast enough to run the rules",
          "Someone had to foresee and hand-write a rule for every case",
          "They couldn't store enough rules",
        ]}
        answer={1}
        reveal="The knowledge-acquisition bottleneck. A human had to anticipate every situation and encode it. But real judgment is full of cases nobody wrote a rule for — and experts often can't even put their own intuition into words. The system is only as good as the rules a person managed to write, and it's brittle to anything new."
      />

      <Note>The wall was clear: you can't hand-write your way to intelligence. What if, instead of writing the rules, we let the machine <strong>learn them from examples</strong>? That's the next lesson.</Note>
    </LessonShell>
  );
}
