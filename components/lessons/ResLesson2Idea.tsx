"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

// Sourced from Hasan, "Research, Strategy" — "Theoretical Framework / The
// Research Idea Canvas" (IF X THEN Y EXCEPT/ESPECIALLY WHEN Z BECAUSE), the
// linear-regression heterogeneity term (beta-3), and the Strategy Experiment Canvas.
export default function ResLesson2Idea({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Every idea is an interaction" topic="how a strategy research idea is structured, from Hasan's 'Research, Strategy': the Research Idea Canvas (IF X happens THEN Y happens EXCEPT/ESPECIALLY WHEN Z, BECAUSE a mechanism); why the contribution lives in the interaction, not the main effect; how that maps onto the regression Y = b0 + b1*X + b2*Z + b3*(X*Z) with beta-3 as the heterogeneity coefficient; and the conceptual + empirical halves of the Strategy Experiment Canvas">
      <p>Most people think a research claim looks like &ldquo;X causes Y.&rdquo; That&apos;s a start — but a flat main effect is rarely interesting on its own. In strategy and management, the claims that carry a paper almost always have a <strong>four-part</strong> shape.</p>

      <H2>The Research Idea Canvas</H2>
      <Note><strong>IF</strong> X happens &nbsp;→&nbsp; <strong>THEN</strong> Y happens &nbsp;→&nbsp; <strong>EXCEPT / ESPECIALLY WHEN</strong> Z is true &nbsp;→&nbsp; <strong>BECAUSE</strong> of some process or mechanism.</Note>
      <p>An example from the book:</p>
      <p><em>IF</em> employees get flexible work arrangements, <em>THEN</em> their productivity and satisfaction improve, <em>EXCEPT WHEN</em> they lack the tools to work remotely, <em>BECAUSE</em> flexibility lets them balance work and life, reducing stress and increasing focus.</p>
      <p>The <strong>IF–THEN</strong> is the effect. But the <strong>EXCEPT/ESPECIALLY WHEN</strong> — the condition Z — is where the insight lives, and the <strong>BECAUSE</strong> is the mechanism that makes it more than a coincidence.</p>

      <LessonPredict
        prompt="In the four-part canvas, which part usually carries the real contribution — the part reviewers find non-obvious?"
        choices={[
          "IF X — naming the treatment",
          "THEN Y — showing the main effect exists",
          "EXCEPT/ESPECIALLY WHEN Z — the condition under which it changes",
        ]}
        answer={2}
        reveal="The Z — the condition. That a treatment has some average effect is often unsurprising; what teaches us something is WHEN it works and when it doesn't, and WHY. The contingency is where you make the invisible visible, and the mechanism (BECAUSE) is what turns a pattern into an explanation. A paper that only shows 'X → Y' with no Z and no mechanism has shown a correlation, not an idea."
      />

      <H2>The same idea, as a regression</H2>
      <p>That canvas maps directly onto the workhorse equation. Start with the baseline:</p>
      <Note>Y = β₀ + β₁·X + ε &nbsp;— &nbsp;β₁ is the average effect of X on Y.</Note>
      <p>Now add the condition Z, and — crucially — the <strong>interaction</strong> term X·Z:</p>
      <Note>Y = β₀ + β₁·X + β₂·Z + β₃·(X·Z) + ε</Note>
      <p>Reading the coefficients: <strong>β₁</strong> is the effect of X; <strong>β₂</strong> is the pre-existing difference between high-Z and low-Z units; and <strong>β₃</strong> — the <strong>heterogeneity coefficient</strong> — tells you whether X works <em>more</em> (or less) when Z is present. If A/B testing raises startup performance (β₁), β₃ tells you whether Silicon-Valley startups benefit more from it than others. That β₃ is your <em>ESPECIALLY/EXCEPT WHEN</em>. It is, almost always, the idea.</p>

      <LessonPredict
        prompt="Your regression shows a big, significant β₁ (X works on average) but a β₃ that's flat and insignificant. What does a reviewer conclude about the contribution?"
        choices={[
          "It's a strong paper — the main effect is what matters",
          "The main effect may be real, but there's no interesting heterogeneity — the 'idea' is thin",
          "β₃ doesn't matter unless you ran an experiment",
        ]}
        answer={1}
        reveal="Thin idea. A clean main effect is evidence, but without a credible interaction you haven't shown the hidden factor — the condition and mechanism that make the finding non-obvious. Reviewers read a flat β₃ as 'so this just works, everywhere, always?' Go find the Z where the effect turns on or off, and the BECAUSE that explains it. That's the difference between a result and a contribution."
      />

      <H2>From idea to design: the Strategy Experiment Canvas</H2>
      <p>Hasan, Koning, and Kim built a canvas to turn this insight into a real study. It has two halves. The <strong>conceptual</strong> half mirrors a strategy paper: the setting and subjects, the business friction, your <em>unique insight</em>, the solution that follows from it, the <em>when/for whom/why</em> (your Z and mechanism), the <em>null model</em>, and the broader impact. The <strong>empirical</strong> half makes it testable: the sample, the dependent variable Y, the independent variable X, the heterogeneity (Z), secondary outcomes that reveal the mechanism, long-term outcomes, and the identification strategy.</p>
      <p>Filled in, the canvas carries you from a one-line hunch to a scientifically rigorous plan — and it keeps every piece pointing at the same idea.</p>

      <Note>Reduce your idea to the canvas: IF X, THEN Y, ESPECIALLY/EXCEPT WHEN Z, BECAUSE a mechanism — then check that your regression actually estimates the β₃ that Z implies. If it doesn&apos;t, you&apos;re testing a main effect, not your idea.</Note>
    </LessonShell>
  );
}
