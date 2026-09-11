"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

// Sourced from Hasan, "Research, Strategy" — "Doing social science" (the craft
// and the little things), "Research Ideas" (a unique insight into why the facts
// are what they are; the null model), and "GAS" (pick two of three).
export default function ResLesson1Good({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="What makes research good" topic="what makes social science research good, from Sharique Hasan's 'Research, Strategy': research as a craft where the little things matter; a research idea as a unique insight into why the facts are what they are; the null model as the conventional wisdom you push against; making the invisible visible; the GAS tradeoff (Generalizable, Accurate, Simple — pick two); and the four execution tests Important, Interesting, Ambitious, Craft">
      <p>Six years after graduating, the average PhD from a top-ten economics program has published about <strong>0.03</strong> papers in their field&apos;s best journals. Not because they aren&apos;t smart. Everyone is smart. What separates the researchers who thrive is something more mundane, and more learnable: they treat research as a <strong>craft</strong>.</p>

      <H2>Research is a craft, and the little things matter</H2>
      <p>Like a carpenter turning an idea for a chair into a finished piece, a researcher turns a question into a paper, and it&apos;s the tiny details that separate an amateurish attempt from a well-crafted study. A great idea is necessary but not sufficient. Rigorous methods, clean exposition, a well-organized table, a properly cited reference: these are what actually get a paper into a top journal. You can&apos;t truly be <em>taught</em> the little things, but you can learn that they matter, and then hunt them down.</p>

      <H2>What is a research idea?</H2>
      <p>A research idea is <strong>a unique insight into why the facts are what they are</strong>. It takes one of two forms: establishing a <em>new fact</em> the field hadn&apos;t seen (e.g. the vast productivity dispersion across firms), or <em>explaining a known fact</em> (e.g. that dispersion comes from differences in management practices). Either way, the job is to see what others don&apos;t: a pattern or anomaly existing theories can&apos;t account for.</p>

      <H2>The null model</H2>
      <p>You can&apos;t see what others miss without knowing what everyone else already believes. That baseline is the <strong>null model</strong>: the conventional wisdom, the default explanation a knowledgeable person would give if you stopped them on the street. Your idea earns its keep only against a null. If there&apos;s no clear conventional wisdom to push against, the idea has nothing to overturn, and nothing to say.</p>

      <LessonPredict
        prompt="You're choosing a null model for your study. Which makes the strongest baseline to test against?"
        choices={[
          "A coin flip: assume no effect at all",
          "The current best explanation in the literature, grounded in a real mechanism",
          "Whatever null makes your result look biggest",
        ]}
        answer={1}
        reveal="The current best explanation. A random 'no effect' null is simple and intuitive, but it's weak: beating it proves little. Strong nulls come from the frontier of the literature: rational-choice and market efficiency in economics, resource-based views in strategy, networks and incentives in organizations. Your evidence is most convincing when strong causal claims overturn a strong null, because that's when you're actually telling people something they didn't already know."
      />

      <H2>Make the invisible visible</H2>
      <p>The best ideas <strong>make the invisible visible</strong>: they surface a force that was always operating but that the null model couldn&apos;t see. And they usually do it through a <em>hidden factor</em>: something that works in some cases and not others, an <em>interaction</em> rather than a flat main effect. (That structure is the whole of the next lesson.)</p>

      <H2>GAS: a theory can&apos;t do everything</H2>
      <p>Hasan&apos;s advisor gave him a framework for what a theory is even trying to do, <strong>GAS</strong>:</p>
      <Note><strong>G</strong>eneralizable: does it explain the facts in <em>all</em> instances? &nbsp;·&nbsp; <strong>A</strong>ccurate: does it reliably predict the right outcome? &nbsp;·&nbsp; <strong>S</strong>imple: is it parsimonious, free of endless &ldquo;but / except when&rdquo; conditionals?</Note>
      <p>The catch: you can&apos;t maximize all three at once. Make a theory more generalizable and you add contingencies, so it stops being simple. Make it generalizable and simple and it loses accuracy in specific cases. You get to pick two: GA, AS, or GS. Great researchers don&apos;t chase all three; they know which two their theory is for, and frame it accordingly.</p>

      <LessonPredict
        prompt="A colleague's theory is beautifully simple and predicts their setting almost perfectly. What have they most likely given up?"
        choices={[
          "Accuracy",
          "Generalizability",
          "Nothing: simple and accurate means it's also general",
        ]}
        answer={1}
        reveal="Generalizability. A theory that is Accurate and Simple (AS) buys that precision-plus-parsimony by narrowing its scope: it nails one setting but won't travel to all others. That's a fine choice, as long as you frame the paper around the two things it does well and are honest about the third. Aiming for all three at once is how theories collapse into vague, hedged mush."
      />

      <H2>Then: is the execution any good?</H2>
      <p>A sharp idea against a strong null still has to be <em>executed</em> well. Hasan judges that on four tests:</p>
      <Note><strong>Important</strong>: do adults care? Does it matter beyond a narrow subfield? &nbsp;·&nbsp; <strong>Interesting</strong>: is it deep enough to sustain a long debate, not a one-line result? &nbsp;·&nbsp; <strong>Ambitious</strong>: could hardly anyone else have done this (rare data, skill, access, creativity)? &nbsp;·&nbsp; <strong>Craft</strong>: is every detail right: pristine data, clean identification, elegant figures?</Note>

      <Note>The through-line: a good paper makes the invisible visible against a <em>clear null</em>, sees a <em>hidden factor</em> others miss, and is Important, Interesting, Ambitious, and full of Craft. Everything else in this series is how you build and defend exactly that.</Note>
    </LessonShell>
  );
}
