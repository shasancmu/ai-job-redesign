"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

// Sourced from Hasan, "Research, Strategy" — "Data analysis for strategy
// research" (the three goals of your tables), "The Linear Regression",
// "Causal Inference" (reverse causality + the all-else-equal problem; the
// gradient of control; why randomization works), and "Experimental Data"
// (measurement-intervention-measurement; the six intervention types).
export default function ResLesson5Data({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Reading the data" topic="data analysis and causal inference in strategy research, from Hasan's 'Research, Strategy': why most claims are causal and why correlation is not causation; the two problems of causal inference (reverse causality, and the 'all else equal' unobserved-confounder problem); the gradient of control from control variables to fixed effects to instrumental variables / difference-in-differences / regression discontinuity to randomized controlled trials; why randomization neutralizes even unobserved characteristics; and field experiments as measurement-intervention-measurement with six intervention types (training, information, incentives, spillovers, process, resources)">
      <p>The point of your empirical work is simple to state: turn raw data into a few tables that convince a reader your claim about how the world works is <strong>true</strong>. The hard part is that almost every interesting claim is <em>causal</em> — X causes Y — and a regression, by itself, only gives you correlation.</p>

      <H2>Correlation is not causation — but causation is the goal</H2>
      <p>Non-causal claims are usually uninteresting: even when you just describe a pattern, readers immediately ask <em>why</em>, and you&apos;re back to cause and effect. So the empirical task is to make a causal statement, and then convince others it&apos;s credible. There&apos;s no silver bullet — just more or less convincing designs.</p>

      <H2>The two problems</H2>
      <p>Take &ldquo;A/B testing increases startup performance.&rdquo; Two things stand between you and a causal claim:</p>
      <Note><strong>1. Reverse causality</strong> — maybe performance drives adoption, not the other way. This one is <em>relatively easy</em>: measure X before you measure Y. &nbsp; <strong>2. The &ldquo;all else equal&rdquo; problem</strong> — some unobserved factor M (say, a growth-oriented strategy) drives both adoption <em>and</em> performance. This one is <em>hard</em>: there are as many confounding stories as there are readers.</Note>

      <H2>The gradient of control</H2>
      <p>Causal inference isn&apos;t &ldquo;find an instrument.&rdquo; It&apos;s ruling out alternative explanations, one design choice at a time, along a gradient:</p>
      <Note><strong>Control variables</strong> — a start, but no longer convincing on their own: the dangerous confounders are usually <em>unobserved</em>. &nbsp; <strong>Fixed effects</strong> (needs panel data) — compare a firm to itself over time, absorbing everything <em>time-invariant</em> about it. &nbsp; <strong>IV / difference-in-differences / regression discontinuity</strong> — get at <em>time-varying</em> unobserved heterogeneity with quasi-random variation. &nbsp; <strong>RCT</strong> — the gold standard.</Note>

      <LessonPredict
        prompt="You add firm fixed effects and your coefficient survives. A reviewer still isn't satisfied. What can fixed effects NOT rule out?"
        choices={[
          "Any confounding at all — fixed effects fully solve causality",
          "Time-VARYING unobserved factors — e.g. a firm turning data-driven, which lifts both adoption and performance",
          "Reverse causality",
        ]}
        answer={1}
        reveal="Time-varying unobservables. Fixed effects absorb everything constant about a firm, which is powerful — in one of Hasan's papers, adding them sharply cut the A/B-testing coefficient, validating the bias concern. But firms change: a shift toward a data-driven strategy can raise performance and drive adoption at the same time, biasing you even with fixed effects. That's when you reach for IV, diff-in-diff, RD, or a true experiment."
      />

      <H2>Why randomization is the gold standard</H2>
      <p>Randomly assigning X breaks its correlation with <em>every</em> pre-treatment characteristic — observed and unobserved alike. Suppose five traits are observable (X1–X5) and five aren&apos;t (X6–X10). Randomization makes X uncorrelated with X1–X5; because assignment was random, you can <em>infer</em> it&apos;s also uncorrelated with X6–X10, even though you never see them. That&apos;s the magic: any X→Y correlation that remains can only be the effect of X.</p>

      <LessonPredict
        prompt="Why does randomization handle UNOBSERVED confounders that clever controls can't?"
        choices={[
          "It measures the unobserved variables directly",
          "Random assignment is uncorrelated with all pre-treatment traits, so the unseen ones can't be driving the result either",
          "It increases the sample size enough to wash them out",
        ]}
        answer={1}
        reveal="Because the assignment mechanism itself is independent of everything that came before it. You don't need to see X6–X10; randomization guarantees, in expectation, that treatment and control are balanced on them. That's why an RCT lets you claim X causes Y without measuring — or even naming — every possible confounder. Controls can only adjust for what you observe; randomization neutralizes what you can't."
      />

      <H2>Field experiments: measurement → intervention → measurement</H2>
      <p>A field experiment measures units, intervenes, and measures again. Design starts from the treated unit&apos;s production function (e.g. academic performance = ability × social connections), and your measures fall into three kinds: relatively fixed characteristics, outcomes, and mechanisms. The intervention itself is almost always one of <strong>six</strong> patterns:</p>
      <Note><strong>Training</strong> · <strong>Information</strong> · <strong>Incentives</strong> · <strong>Spillovers</strong> (peer/network effects) · <strong>Process</strong> (change how work is done) · <strong>Resources</strong> (lift a constraint, e.g. capital).</Note>
      <p>Each addresses a specific <em>friction</em> holding a person or firm back — and naming which of the six you&apos;re using clarifies what your treatment actually tests.</p>

      <H2>And the tables do three jobs</H2>
      <p>Tie it back: your tables exist to (A) convince the reader the causal effect is real against a strong null, (B) explore its implications, and (C) show the scope conditions — where the effect is strongest — via interactions. Design, identification, and table structure are all the same argument, told in numbers.</p>

      <Note>Causal inference is the discipline of approximating &ldquo;all else equal.&rdquo; Randomization does it most rigorously; fixed effects, IV, diff-in-diff, and RD get you closer when you can&apos;t randomize. Your job is to convince the reader your finding survives the alternative stories — and to be honest about which ones it doesn&apos;t.</Note>
    </LessonShell>
  );
}
