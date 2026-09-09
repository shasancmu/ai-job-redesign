"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

// Sourced from Hasan, "Research, Strategy" — "Theoretical Framework" (null
// setup, non-obvious claims, supporting + counter-arguments, scope + extension
// claims), "Methods and Data", "Results" (the three tables), "Discussion", and
// "Making points" (one point per paragraph; the reread test).
export default function ResLesson4Argument({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Building the argument" topic="how to build a paper's argument, from Hasan's 'Research, Strategy': the theory section (set up a null model, make non-obvious claims, give supporting arguments, then present counter-arguments to raise the stakes, plus scope and extension claims); the methods and data section (data, variables, empirical strategy); the results section as three tables (primary claim vs a strong null, implications, scope conditions via interactions); the discussion; and 'making points' — one clear point per paragraph, tested by whether a reader can grasp it without rereading">
      <p>Structure gets a reader through your paper. <em>Argument</em> is what changes their mind. A paper is a persuasive text: a sequence of points that move a skeptical reader from the null model to your conclusion. Here&apos;s how each section does its part.</p>

      <H2>The theory section: earn belief</H2>
      <p>Theory begins where the introduction did — with a <strong>null model</strong>, the world most readers already believe. Then you make <strong>non-obvious claims</strong>: not outlandish, but things a person reasoning from what they already know might get wrong. You build belief by chaining <em>smaller</em> claims that are intuitive or already established, then linking them to your bigger claim. (When Hasan argued A/B testing improves startup performance, he built it up: startups face uncertainty → experimentation reduces it → A/B testing is cheap experimentation → organizations that learn faster perform better.)</p>

      <H2>Then argue against yourself</H2>
      <p>Now present the <strong>counter-arguments</strong> — the reasons your claim might be wrong (founders&apos; gut instinct beats testing; entrepreneurs are overconfident; informal tinkering already works). This feels counterproductive. It&apos;s the opposite.</p>

      <LessonPredict
        prompt="Why deliberately spell out the strongest arguments AGAINST your own claim?"
        choices={[
          "To look balanced and humble for the reviewers",
          "It raises the stakes — if the opposite is plausible, your evidence actually shifts beliefs",
          "To pad the theory section to the expected length",
        ]}
        answer={1}
        reveal="It raises the stakes. If the counter-claim is compelling, then your empirical test becomes meaningful — it can genuinely move a reader from the counter-claim toward your claim. If everyone already agrees with you, your paper changes no minds and teaches nothing. A credible opposing view is what gives your evidence something to do. After the counter-arguments, add scope claims (when your claim holds) and extension claims (what else it implies)."
      />

      <H2>Methods &amp; data: be transparent</H2>
      <p>This section is fundamentally <em>descriptive</em>. Three parts: describe the <strong>data</strong> (how you built it, what&apos;s unique about it that enables a convincing test); describe the <strong>variables</strong> (each as its own short paragraph, with descriptive statistics); and state the <strong>empirical strategy</strong> — the model you estimate, and what sign, significance, and magnitude you&apos;re looking for. Say plainly how the design lets you make a causal claim (the next lesson is all about that).</p>

      <H2>Results: three tables</H2>
      <p>The results section is usually short — the work is already done. It&apos;s built around three primary tables (there will be more, but they&apos;re all versions of these three):</p>
      <Note><strong>Table 1 — the claim.</strong> Convince the reader your primary effect is real and interesting, especially by showing it survives against a <em>strong null</em>. &nbsp; <strong>Table 2 — the implications.</strong> Elaborate what the claim means downstream. &nbsp; <strong>Table 3 — scope conditions.</strong> Nothing is universally true; use <em>interaction effects</em> to show where the effect is strongest and weakest.</Note>
      <p>Each subsection pairs one sub-claim with one table and a short narrative. Notice Table 3 is exactly the β₃ interaction from the idea lesson — your scope conditions <em>are</em> your hidden factor, shown in the data.</p>

      <H2>Discussion &amp; conclusion</H2>
      <p>Five short paragraphs: restate the motivation and contribution; summarize the main findings (including surprises); give scope conditions (where effects are strong or weak); state the contribution to the literature; acknowledge limitations and point to future work — then end on the implications for theory and practice.</p>

      <H2>Making points</H2>
      <p>Zoom all the way in. An article is a <strong>sequence of points</strong> leading to a conclusion, and <em>each paragraph should make exactly one</em>. Write your paragraph topic-sentences as a list and you should be able to read the argument straight down. There&apos;s a single, brutal test for whether a paragraph works:</p>

      <LessonPredict
        prompt="Hasan's one metric for a strong paragraph is:"
        choices={[
          "It's at least four sentences long",
          "The reader can grasp its point without needing to reread it",
          "It cites at least two prior papers",
        ]}
        answer={1}
        reveal="Can the reader understand the paragraph without rereading it? If yes, the point is clear and the paragraph earns its place. If they have to loop back, the point is muddy — split it, cut the extraneous detail, or move the topic sentence to the front. Clarity at the paragraph level is what makes the whole argument feel effortless."
      />

      <Note>Build the argument as a ladder of belief: set the null, make a non-obvious claim, support it with intuitive steps, argue the other side to raise the stakes, then let three tables — claim, implications, scope — carry the evidence. And keep one point per paragraph, each passable without a reread.</Note>
    </LessonShell>
  );
}
