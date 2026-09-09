"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import ScalingDemo from "@/components/lessons/ScalingDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson4Scale({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Scale, self-play, and the limits" topic="the bitter lesson, scaling laws and emergence, the data wall, post-training (RLHF and instruction tuning), reasoning and test-time compute, self-play and verifiable signals, and what AI can and cannot do: search, structure, think, translate">
      <p>Next-token prediction and attention had been around for years. So why did AI suddenly feel magical around 2020? One word: <strong>scale</strong> — vastly more data, parameters, and compute.</p>

      <H2>The bitter lesson</H2>
      <Milestone year="2019">Rich Sutton&apos;s &ldquo;Bitter Lesson&rdquo;: over the history of AI, general methods that simply leverage more computation — search and learning — have won out over methods that lean on hand-built human knowledge. It stings, because human cleverness keeps losing to raw scale.</Milestone>

      <H2>Scaling laws</H2>
      <p>Even stranger: the gains are <strong>predictable</strong>. Plot a model&apos;s error against the compute used to train it, and you get a clean, straight line over many orders of magnitude. This is what let labs <em>bet</em> hundreds of millions on a training run before it finished — the curve told them roughly what they&apos;d get.</p>

      <ScalingDemo />

      <H2>Emergence: new abilities that switch on</H2>
      <p>The loss curve is smooth, but specific <em>skills</em> often aren&apos;t. A model can be useless at, say, multi-step arithmetic or a foreign language across a wide range of sizes — and then, past some scale, the ability <strong>appears</strong>, fairly abruptly. These <strong>emergent capabilities</strong> are part of why scaling has felt like magic and why each generation surprises even its builders: you don&apos;t fully know what a bigger model can do until you train it and test it.</p>

      <LessonPredict
        prompt="Is &ldquo;just add more compute&rdquo; the whole story of modern AI?"
        choices={[
          "Yes, scaling alone explains everything",
          "Mostly true empirically, but with real caveats and limits",
          "No, scale doesn't matter at all",
        ]}
        answer={1}
        reveal="Mostly true, with caveats. The scaling curve is remarkably robust in the range we've measured, and it drove the last decade. But lower loss isn't the same as more capability, high-quality data is finite, returns diminish, and how far scaling goes is genuinely debated. Data quality and what happens after pre-training matter just as much."
      />

      <H2>The data wall</H2>
      <p>Scaling needs fuel, and the best fuel is running low. The models have already read most of the high-quality text humans have written; you can&apos;t 10× the internet on demand. So the frontier has shifted from &ldquo;more data&rdquo; to <strong>better data</strong> and <strong>better use of the data we have</strong> — carefully curated, filtered, and increasingly <em>generated</em>.</p>

      <H2>Raw model vs. helpful assistant: post-training</H2>
      <p>A freshly pre-trained model is a brilliant autocomplete, not an assistant — it will happily continue your question with ten more questions. What turns it into ChatGPT is <strong>post-training</strong>: first showing it examples of good answers (instruction tuning), then having humans rank its responses so it learns which are preferred (<strong>RLHF</strong> — reinforcement learning from human feedback). Same underlying next-token engine; a thin, crucial layer of &ldquo;be helpful, honest, and follow instructions&rdquo; wrapped around it.</p>

      <H2>Thinking longer: test-time compute</H2>
      <p>The newest lever isn&apos;t a bigger model — it&apos;s letting a model <strong>spend more compute at the moment you ask</strong>. &ldquo;Reasoning&rdquo; models generate a long private chain of intermediate steps before answering, effectively thinking out loud to themselves. On hard math and code this can beat a much larger model that answers instantly. Scale moved from <em>training</em> time to <em>thinking</em> time.</p>

      <H2>Learning from itself</H2>
      <p>How do you improve past the data wall? Let the model generate its own training signal. <strong>Self-play</strong> — a system playing millions of games against itself — produced superhuman Go with <em>no</em> human games to learn from. For language models, the same idea powers a lot of recent progress: generate many attempts, keep the good ones, learn from them.</p>
      <Milestone year="2017">AlphaZero taught itself chess and Go from scratch by self-play alone, surpassing every prior program in hours.</Milestone>

      <LessonPredict
        prompt="Self-generated data made AlphaZero superhuman at Go. Why doesn't the same trick trivially make a chatbot superhuman at everything?"
        choices={[
          "It does — chatbots are already superhuman at everything",
          "In Go you can always tell who won; for most open-ended answers there's no automatic check",
          "Chatbots can't generate their own text",
        ]}
        answer={1}
        reveal="You need a verifiable signal. In a game you know who won; in math you can check the proof. There the loop works beautifully. But for 'write a good essay' there's no built-in referee, and feeding a model its own unchecked output degrades it. Progress is fastest exactly where correctness can be checked — games, code, math."
      />
      <Note>The catch, in one line: self-generated data helps only when there&apos;s a way to <strong>check</strong> it. A verifiable signal is what makes it work — and its absence is why open-ended judgment is where models stay weakest.</Note>

      <H2>So what can it actually do?</H2>
      <p>Put it together and a clear picture emerges. Today&apos;s AI is superb at four things: <strong>search</strong> (finding the relevant pattern in an ocean of text), <strong>structure</strong> (organizing messy input into a clean form), <strong>think</strong> (recombining patterns into a plausible next step), and <strong>translate</strong> (moving an idea between forms — code, prose, a summary). Notice these are the tasks where the answer is <em>latent in the data</em> and, often, checkable.</p>
      <p>And it is unreliable exactly where those run out: <strong>genuine novelty</strong> beyond its training, <strong>reasoning it can&apos;t check</strong>, and anything needing <strong>real-world grounding, memory, or agency</strong>. It predicts plausible continuations — which is powerful, and is also its ceiling. That line between the four strengths and the ceiling is the single most useful thing to hold in your head when you decide what to hand a model and what to keep for yourself.</p>

      <Note>That&apos;s the whole machine: rules gave way to learning, learning scaled into language, and scale — plus post-training and a verifiable signal — is pushing the frontier, bounded by the fact that, underneath, it is still completing patterns it has seen.</Note>
    </LessonShell>
  );
}
