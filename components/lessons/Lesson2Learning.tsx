"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import FunctionFitDemo from "@/components/lessons/FunctionFitDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson2Learning({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Letting the data write the function" topic="statistical learning and neural networks: learning a function from examples, Dawes and Meehl on statistical vs. clinical judgment, and why data and compute became the bottleneck">
      <p>The breakthrough idea was to stop writing rules and instead <strong>learn them from examples</strong>. Show the machine thousands of cases, inputs and their correct answers, and have it find the pattern, the <strong>function</strong> that maps input to output, on its own.</p>

      <H2>A humbling result</H2>
      <p>How well could a mere formula really do against a seasoned human expert? Surprisingly well. Across decades of studies, clinical diagnoses, parole decisions, graduate admissions, a simple statistical model, fit to past data, reliably <em>matched or beat</em> the expert&apos;s judgment.</p>
      <Milestone year="1954–1989">Paul Meehl, then Robyn Dawes, showed that simple actuarial models routinely outperform expert &ldquo;clinical&rdquo; judgment. The expert has the same information, but the formula weighs it consistently, while the human is swayed by the last case, the mood, the story.</Milestone>

      <LessonPredict
        prompt="An experienced expert vs. a simple formula built from past data, whose predictions tend to be more accurate?"
        choices={["The expert, by a wide margin", "The formula, or a tie", "They're never comparable"]}
        answer={1}
        reveal="The formula, usually. This is the Meehl–Dawes result. It's why insurers, banks, and admissions offices lean on models: a consistent statistical rule beats inconsistent human judgment on the same inputs. It was the first strong sign that learning from data could beat hand-crafted expertise."
      />

      <FunctionFitDemo />

      <H2>Neural networks</H2>
      <p>A <strong>neural network</strong> is the same idea with a much more flexible curve. Instead of fitting a straight line, it fits a function with millions of adjustable knobs, so it can capture very complicated patterns, a cat in a photo, a word in a sentence. It&apos;s still just learning a function from examples.</p>
      <Milestone year="2012">AlexNet crushed the ImageNet image-recognition contest using a deep neural network trained on GPUs. The idea was decades old; what was new was <strong>enough labeled data and enough compute</strong> to train it.</Milestone>

      <Note>So the bottleneck moved. It was never really the algorithm, it was <strong>data and compute</strong>. Give a flexible enough model enough examples and enough processing power, and it learns. Hold that thought for language.</Note>
    </LessonShell>
  );
}
