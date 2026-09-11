"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import RuleFlowDemo from "@/components/lessons/RuleFlowDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson1Rules({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="When humans wrote the logic" topic="the rules era of AI: expert systems, decision support systems, Polanyi's paradox, the combinatorial explosion, the knowledge-acquisition bottleneck, and the first AI winter">
      <p>For its first few decades, &ldquo;artificial intelligence&rdquo; meant something very concrete: a person sat down and <strong>wrote the rules by hand</strong>. If the AI seemed smart, it was because a human had painstakingly encoded what to do in every situation they could think of. There was no learning and no mystery inside the box: open it up and you would find a long list of instructions a human had typed.</p>

      <H2>Expert systems</H2>
      <p>The flagship idea was the <strong>expert system</strong>: interview a human expert, turn their knowledge into hundreds of IF-THEN rules, and let the computer follow them like a giant flowchart. A rule looked exactly as plain as it sounds:</p>
      <div className="rounded-xl border border-line bg-mist/40 p-4 font-mono text-[13px] leading-relaxed text-slate-700">
        IF the infection is bacterial<br />
        AND the site is blood<br />
        AND the patient is an adult<br />
        THEN suspect E. coli (confidence 0.7)
      </div>
      <p>String hundreds of these together and the machine could chain from symptoms to a diagnosis, explaining each step by naming the rules it fired. That transparency was a real strength: unlike today&apos;s models, an expert system could always tell you <em>why</em>.</p>
      <Milestone year="1965">DENDRAL, at Stanford, inferred molecular structures from mass-spectrometry data: the first program to rival specialists in a narrow scientific task, and the proof of concept for the whole approach.</Milestone>
      <Milestone year="1976">MYCIN used about 600 hand-written rules to diagnose blood infections and recommend antibiotics, and it performed comparably to specialists.</Milestone>

      <RuleFlowDemo />

      <H2>Why it was thrilling, and where the money went</H2>
      <p>The promise was intoxicating: capture a scarce expert&apos;s knowledge <em>once</em>, and run it a million times, tirelessly and consistently, in every hospital or bank at once. By the 1980s companies poured money into &ldquo;knowledge engineering,&rdquo; and specialized hardware was built just to run these rule bases faster.</p>

      <H2>Decision support systems</H2>
      <p>Alongside expert systems sat <strong>decision support systems</strong>: tools that combined data and models to help a person decide (a loan officer, a manager, a doctor). The common thread with expert systems: <em>a human supplied the logic</em>, and the machine executed it faithfully. The intelligence lived in the person who wrote the rules; the computer was a very fast, very literal clerk.</p>

      <LessonPredict
        prompt="These systems worked. So what was the limitation that eventually stopped them?"
        choices={[
          "Computers weren't fast enough to run the rules",
          "Someone had to foresee and hand-write a rule for every case",
          "They couldn't store enough rules",
        ]}
        answer={1}
        reveal="The knowledge-acquisition bottleneck. A human had to anticipate every situation and encode it. But real judgment is full of cases nobody wrote a rule for, and experts often can't even put their own intuition into words. The system is only as good as the rules a person managed to write, and it's brittle to anything new."
      />

      <H2>The two walls it hit</H2>
      <p>The bottleneck had two distinct causes, and both are worth understanding because they still shape what AI is good and bad at today.</p>
      <p><strong>First, experts can&apos;t say what they know.</strong> The philosopher Michael Polanyi put it as <em>&ldquo;we know more than we can tell.&rdquo;</em> A doctor recognizes a sick patient at a glance; a chess master sees the right move before calculating. Ask them to write down the rule they used and they can&apos;t. The knowledge is real but tacit. You can only encode the sliver of expertise a person can verbalize.</p>
      <p><strong>Second, the world has too many cases.</strong> Every rule you add interacts with the others, and the edge cases multiply faster than you can write them. Cover one exception and you expose three more. This <strong>combinatorial explosion</strong> means a hand-built rule base is always brittle at its edges: it does beautifully on the situations its authors imagined and falls off a cliff on the ones they didn&apos;t.</p>
      <Milestone year="late 1980s">The first AI winter: expert systems proved expensive to build and maintain, brittle in the real world, and hard to update. Funding and enthusiasm collapsed, a warning that a working demo is not the same as a reliable system.</Milestone>

      <LessonPredict
        prompt="If experts can't fully articulate their knowledge, what's the natural next move?"
        choices={[
          "Hire more knowledge engineers to interview them harder",
          "Show the machine many worked examples and let it infer the rule itself",
          "Give up on hard judgment tasks",
        ]}
        answer={1}
        reveal="Learn from examples instead of asking for the rule. If a master can't state the rule but can label thousands of cases correctly, let the machine find the pattern that fits those cases. That single shift, from writing rules to learning them, is the whole next era."
      />

      <Note>The wall was clear: you can&apos;t hand-write your way to intelligence, because the knowledge won&apos;t fit into rules and the cases won&apos;t stop coming. What if, instead of writing the rules, we let the machine <strong>learn them from examples</strong>? That&apos;s the next lesson.</Note>
    </LessonShell>
  );
}
