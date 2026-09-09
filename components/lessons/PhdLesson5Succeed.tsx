"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function PhdLesson5Succeed({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="How to succeed in your PhD" topic="what separates thriving PhD students: the two products (papers and presentations), visibility and the hidden curriculum, managing the advisor relationship, modeling the best students, and consistency over heroics">
      <p>Talent is table stakes in a PhD program — everyone was the smart one. What separates the students who thrive is surprisingly mundane, and mostly about <em>behavior</em>, not brainpower.</p>

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

      <H2>The two products, and how they compound</H2>
      <p>Academic output is two tangible things: <strong>papers and presentations</strong>. The trap is treating them as separate from consumption. They compound with their inputs: <em>writing</em> good papers requires <em>reading</em> good papers, and <em>giving</em> good talks requires <em>going</em> to talks. Students who skip other people&apos;s presentations are quietly starving their own — you can&apos;t produce at a level you never see. Treat every seminar as free training in what &ldquo;good&rdquo; looks like.</p>

      <H2>Visibility and the hidden curriculum</H2>
      <p>Be on campus and in the intellectual life. Most of what actually helps you isn&apos;t in any syllabus — it&apos;s the <strong>hidden curriculum</strong> that travels through hallways: which methods reviewers currently distrust, which journals turn around fast, who&apos;s hiring, how a paper really gets fixed. That &ldquo;mindless&rdquo; chatter carries tips, tricks, and the network links that guide you through the whole thing. Isolation is the single common thread among students who struggle; presence is the cheapest edge available.</p>

      <H2>Manage the advisor relationship</H2>
      <p>Your advisor is the highest-leverage relationship in the whole PhD — they shape your problems, co-author your best work, and write the letter that moves a hiring committee. Treat it like a relationship you tend, not a service you receive: come to meetings with progress and specific questions, close the loop on their advice, and make it easy to champion you. An advisor who feels their time compounds in you will invest more of it.</p>

      <H2>Take advice; model the best</H2>
      <p>Don&apos;t reinvent the wheel. Ask faculty and senior students, and take the <em>explicit</em> advice. Then copy the <em>implicit</em> advice by modeling yourself on the strongest students a cohort or two above you — how they choose problems, structure a week, handle a rejection. Their revealed habits are a curriculum no one will hand you. Watching a great student up close is worth a semester of abstract guidance.</p>

      <H2>Consistency over heroics</H2>
      <p>Research is a marathon of small daily progress, not occasional all-nighters. A real, focused <strong>5–6 hours a day, most days</strong>, compounds into a body of work; heroic bursts followed by burnout don&apos;t. The students who finish strong are rarely the ones who worked the hardest for a week — they&apos;re the ones who kept showing up for years.</p>

      <LessonPredict
        prompt="Two students, equally smart. One holes up and works alone in intense bursts; the other keeps regular hours, attends every seminar, and shadows the best senior student. Who's more likely to place well?"
        choices={[
          "The lone hero — deep focus wins",
          "The present one — the network, the modeling, and steady output compound",
          "It's purely luck",
        ]}
        answer={1}
        reveal="The present one, and it isn't close over six years. The lone hero misses the hidden curriculum, reinvents solved problems, and burns out. Presence plus steady output plus modeling the best compounds — more feedback, better problems, stronger letters, a real network. Isolation is the most common failure mode; visibility is the cheapest fix."
      />

      <Note>If you change one thing: get out of your office and into the intellectual life, and start shipping papers and talks. Presence plus output is most of the game.</Note>
    </LessonShell>
  );
}
