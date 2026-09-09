"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import FunctionFitDemo from "@/components/lessons/FunctionFitDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson2Learning({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Letting the data write the function" topic="statistical learning and neural networks: learning a function from examples, generalization vs. overfitting, why consistency beats expert judgment (Meehl, Dawes, Kahneman on noise), representation learning, and why data and compute became the bottleneck">
      <p>The breakthrough idea was to stop writing rules and instead <strong>learn them from examples</strong>. Show the machine thousands of cases — inputs and their correct answers — and have it find the pattern, the <strong>function</strong> that maps input to output, on its own. Nobody states the rule; the data implies it, and the machine recovers it.</p>

      <H2>What &ldquo;learning a function&rdquo; actually means</H2>
      <p>Think of every past case as a dot on a graph: the inputs on one axis, the right answer on the other. Learning is just <strong>drawing the curve that best fits the dots</strong> — and then using that curve to answer a case you&apos;ve never seen. The real goal isn&apos;t to memorize the dots; it&apos;s to <strong>generalize</strong> to new ones.</p>
      <p>That distinction is the whole game. A curve so wiggly it passes exactly through every training dot has usually <em>memorized noise</em> and will predict new cases badly — this is <strong>overfitting</strong>. A curve too stiff to follow the real trend <strong>underfits</strong>. Good learning threads the needle: capture the signal, ignore the noise. Try it in the demo below — over-flex the curve and watch it get worse, not better, on fresh data.</p>

      <FunctionFitDemo />

      <H2>A humbling result</H2>
      <p>How well could a mere formula really do against a seasoned human expert? Surprisingly well. Across decades of studies — clinical diagnoses, parole decisions, graduate admissions — a simple statistical model, fit to past data, reliably <em>matched or beat</em> the expert&apos;s judgment.</p>
      <Milestone year="1954–1989">Paul Meehl, then Robyn Dawes, showed that simple actuarial models routinely outperform expert &ldquo;clinical&rdquo; judgment. The expert has the same information, but the formula weighs it consistently, while the human is swayed by the last case, the mood, the story.</Milestone>

      <div className="rounded-xl border border-line bg-mist/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The same story, over and over</div>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p><span className="font-semibold text-ink">Wine.</span> A one-line formula from winter rainfall and summer heat predicted Bordeaux vintage quality, and prices, better than the expert critics tasting it (Ashenfelter).</p>
          <p><span className="font-semibold text-ink">Credit.</span> A credit score, just a formula, approves loans more accurately, and far more consistently, than a loan officer reading each file by hand.</p>
          <p><span className="font-semibold text-ink">Hiring.</span> A short structured score on a few job-relevant facts predicts who will perform better than a manager&rsquo;s gut read from an interview.</p>
          <p><span className="font-semibold text-ink">Medicine.</span> Simple risk scores and checklists match or beat physicians&rsquo; unaided judgment on many diagnoses and prognoses.</p>
        </div>
      </div>

      <LessonPredict
        prompt="An experienced expert vs. a simple formula built from past data, whose predictions tend to be more accurate?"
        choices={["The expert, by a wide margin", "The formula, or a tie", "They're never comparable"]}
        answer={1}
        reveal="The formula, usually. This is the Meehl–Dawes result. It's why insurers, banks, and admissions offices lean on models: a consistent statistical rule beats inconsistent human judgment on the same inputs. It was the first strong sign that learning from data could beat hand-crafted expertise."
      />

      <H2>Why consistency wins</H2>
      <p>The surprising part isn&apos;t that the model is <em>smarter</em> — it usually isn&apos;t. It&apos;s that the human is <strong>noisy</strong>. Give the same expert the same file twice, a week apart, and they often reach different conclusions; hunger, fatigue, and the order of cases all leak in. A formula, by contrast, gives the same answer every time. Daniel Kahneman called this hidden variability <strong>noise</strong>, and it quietly wrecks human judgment. The model wins less by having better insight than by never having a bad day.</p>

      <H2>Neural networks: learning the features too</H2>
      <p>A <strong>neural network</strong> is the same idea with a far more flexible curve. Instead of fitting a straight line, it fits a function with millions of adjustable knobs, stacked in <strong>layers</strong>. That layering is the key: early layers learn simple pieces (an edge, a curve), later layers combine them into richer ones (an eye, a wheel), and the final layer reads those to decide. Nobody tells it what an &ldquo;edge&rdquo; or an &ldquo;eye&rdquo; is — it <strong>invents the useful features itself</strong> from raw pixels. This is called <em>representation learning</em>, and it&apos;s why neural nets handle messy inputs — images, audio, language — that no hand-written formula could.</p>
      <Milestone year="2012">AlexNet crushed the ImageNet image-recognition contest using a deep neural network trained on GPUs. The idea was decades old; what was new was <strong>enough labeled data and enough compute</strong> to train it.</Milestone>

      <LessonPredict
        prompt="Neural nets existed for decades. Why did they suddenly work in the 2010s?"
        choices={[
          "A brand-new mathematical breakthrough in the algorithm",
          "Enough data and enough compute (GPUs) to actually train the big flexible models",
          "Computers finally became conscious",
        ]}
        answer={1}
        reveal="Data and compute, not a new idea. The core algorithm (backpropagation) was from the 1980s. What changed was the internet's flood of labeled data and GPUs fast enough to train models with millions of knobs. The bottleneck was never really the math — it was fuel."
      />

      <Note>So the bottleneck moved. It was never really the algorithm — it was <strong>data and compute</strong>. Give a flexible enough model enough examples and enough processing power, and it learns the pattern <em>and</em> the features it needs. Hold that thought for language.</Note>
    </LessonShell>
  );
}
