"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import ScalingDemo from "@/components/lessons/ScalingDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson4Scale({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Scale, self-play, and the limits" topic="the bitter lesson, scaling laws (and whether they hold), self-play and synthetic data, and what AI can and cannot do — search, structure, think, translate">
      <p>Next-word prediction and attention had been around for years. So why did AI suddenly feel magical around 2020? One word: <strong>scale</strong> — vastly more data, parameters, and compute.</p>

      <H2>The bitter lesson</H2>
      <Milestone year="2019">Rich Sutton&apos;s &ldquo;Bitter Lesson&rdquo;: over the history of AI, general methods that simply leverage more computation — search and learning — have won out over methods that lean on hand-built human knowledge. It stings, because cleverness keeps losing to scale.</Milestone>

      <H2>Scaling laws</H2>
      <p>Even stranger: the gains are <strong>predictable</strong>. Plot a model&apos;s error against the compute used to train it, and you get a clean, straight line over many orders of magnitude.</p>

      <ScalingDemo />

      <LessonPredict
        prompt="Is &ldquo;just add more compute&rdquo; the whole story of modern AI?"
        choices={[
          "Yes — scaling alone explains everything",
          "Mostly true empirically, but with real caveats and limits",
          "No — scale doesn't matter at all",
        ]}
        answer={1}
        reveal="Mostly true, with caveats. The scaling curve is remarkably robust in the range we've measured, and it drove the last decade. But lower loss isn't the same as more capability, high-quality data is finite, returns diminish, and how far scaling goes is genuinely debated. Data quality and what happens after pre-training (like training on reasoning) matter too."
      />

      <H2>Learning from itself</H2>
      <p>The newest twist: models generate their own training signal. <strong>Self-play</strong> — a system playing millions of games against itself — produced superhuman Go with <em>no</em> human games to learn from. For language models, the same idea powers a lot of recent progress: generate attempts, keep the good ones, learn.</p>
      <Milestone year="2017">AlphaZero taught itself chess and Go from scratch by self-play alone, surpassing every prior program in hours.</Milestone>
      <Note>The catch: self-generated data helps only when there&apos;s a way to <strong>check</strong> it — you can tell who won the game, or whether the math is right. Feed a model its own unchecked output and quality <em>degrades</em>. A verifiable signal is what makes it work.</Note>

      <H2>So what can it actually do?</H2>
      <p>Put it together and a clear picture emerges. Today&apos;s AI is superb at four things — <strong>search</strong> (finding the relevant pattern in an ocean of text), <strong>structure</strong> (organizing messy input into a clean form), <strong>think</strong> (recombining patterns into a plausible next step), and <strong>translate</strong> (moving an idea between forms — code, prose, a summary).</p>
      <p>And it is unreliable exactly where those run out: <strong>genuine novelty</strong> beyond its training, <strong>reasoning it can&apos;t check</strong>, and anything needing <strong>real-world grounding, memory, or agency</strong>. It predicts plausible continuations — which is powerful, and is also its ceiling.</p>

      <Note>That&apos;s the whole machine: rules gave way to learning, learning scaled into language, and scale plus a verifiable signal is pushing the frontier — bounded by the fact that, underneath, it is still completing patterns it has seen.</Note>
    </LessonShell>
  );
}
