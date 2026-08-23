"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson5Succeed({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="How to succeed in your PhD" topic="what actually separates thriving PhD students: the two products (papers and presentations), visibility, taking advice, and modeling the best students above you">
      <p>Talent is table stakes in a PhD program, everyone was the smart one. What separates the students who thrive is surprisingly mundane, and mostly about behavior.</p>

      <LessonPredict
        prompt="What most predicts a PhD student's success?"
        choices={[
          "Raw intelligence and test scores",
          "Being present, on campus, in talks, producing, and taking advice",
          "Working alone in long heroic bursts",
        ]}
        answer={1}
        reveal="Being present and productive. The students who do worst are absent, isolated, reinvent the wheel, and ignore advice. The ones who thrive are around, they attend talks, give talks, absorb the tips and gossip and networks, and model themselves on the best students a year or two ahead."
      />

      <H2>The two products</H2>
      <p>Academic output is two tangible things: <strong>papers and presentations</strong>. And they compound, <em>writing</em> good papers requires <em>reading</em> good papers; <em>giving</em> good talks requires <em>going</em> to talks. Students who skip other people's presentations are quietly starving their own.</p>

      <H2>Visibility</H2>
      <p>Be on campus and in the intellectual life. The &ldquo;mindless&rdquo; hallway chatter carries tips, tricks, gossip, and the network links that guide you through the whole thing. Isolation is the common thread among students who struggle.</p>

      <H2>Take advice; model the best</H2>
      <p>Don't reinvent the wheel. Ask faculty and senior students; take the explicit advice, and copy the <em>implicit</em> advice by modeling yourself on the strongest students a cohort or two above you. And work consistently, a real 5–6 focused hours a day, most days, beats occasional heroics.</p>

      <Note>If you change one thing: get out of your office and into the intellectual life, and start shipping papers and talks. Presence plus output is most of the game.</Note>
    </LessonShell>
  );
}
