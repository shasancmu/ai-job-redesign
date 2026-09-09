"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import MarkovDemo from "@/components/lessons/MarkovDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson3Language({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Predicting the next word" topic="language models: tokens, the Markov / n-gram idea and its short-memory limit, why next-word prediction forces understanding, meaning as geometry (embeddings), the Transformer and attention, in-context learning, and why models hallucinate">
      <p>Language seemed hopeless for rules — too many exceptions. The trick that cracked it is almost silly in its simplicity: <strong>predict the next word</strong>. Do that well enough, over and over, and you can write.</p>

      <H2>First, what&apos;s a &ldquo;word&rdquo; to a model?</H2>
      <p>Models don&apos;t work in words exactly; they work in <strong>tokens</strong> — chunks of text, often a word or a piece of one (&ldquo;unhappiness&rdquo; might be <em>un&thinsp;·&thinsp;happ&thinsp;·&thinsp;iness</em>). Everything the model reads and writes is a stream of these tokens, each turned into numbers. Whenever you hear &ldquo;predict the next word,&rdquo; read it as <strong>predict the next token</strong>. That&apos;s also why models charge and think in tokens, and why they can spell strangely — they never see letters, only chunks.</p>

      <H2>The old way: look at the last few words</H2>
      <p>The earliest statistical language models used the <strong>Markov</strong> idea (also called n-grams): to guess the next word, just look at the last one or two words and pick whatever most often followed them in a big pile of text. No grammar, no meaning — just counting.</p>

      <MarkovDemo />

      <LessonPredict
        prompt="A model that only ever looks at the last two words to pick the next one, what's its core weakness?"
        choices={[
          "It can't spell",
          "It has no long-range memory, it forgets the topic a sentence ago",
          "It's too slow",
        ]}
        answer={1}
        reveal="Short, fixed memory. Looking at only the last word or two, it can't keep a thought going across a sentence, let alone a paragraph. It produces locally-plausible, globally-incoherent text. To write real language you need a much longer, and smarter, memory."
      />

      <H2>Why &ldquo;just predict the next word&rdquo; is deeper than it sounds</H2>
      <p>Here&apos;s the twist that makes it work. To predict the next token <em>reliably</em> across billions of sentences, guessing letters isn&apos;t enough — you have to pick up on grammar, facts, tone, and even a bit of reasoning. To finish &ldquo;The capital of the country north of Mexico is…&rdquo; the model has to have absorbed geography. <strong>Compression forces competence</strong>: the only way to predict a huge, varied text stream well is to internalize the regularities behind it. Understanding falls out as a side effect of getting good at the guessing game.</p>

      <H2>Meaning becomes geometry</H2>
      <p>To do this, the model represents each token as a long list of numbers — a point in a high-dimensional space, called an <strong>embedding</strong>. The remarkable part: it arranges that space by <em>meaning</em>. Words used similarly land near each other; directions in the space capture relationships. The classic example: take the point for <em>king</em>, subtract <em>man</em>, add <em>woman</em>, and you land right next to <em>queen</em>. Meaning isn&apos;t stored as a definition anywhere — it&apos;s the <strong>geometry</strong> the model learned to make its predictions come out right.</p>

      <H2>The new way: attention</H2>
      <p>The leap was an architecture that lets every token <strong>look at every other token</strong> and decide which ones matter, called <strong>attention</strong>. Now the &ldquo;memory&rdquo; is long and <em>learned</em>: reading a pronoun, the model can reach back thousands of tokens to the name it refers to and pull it forward. The span it can look across at once is its <strong>context window</strong> — the model&apos;s working memory for a conversation or document.</p>
      <Milestone year="2017">&ldquo;Attention Is All You Need&rdquo; introduced the Transformer, the architecture behind essentially every modern large language model.</Milestone>

      <H2>Putting it together — and a surprise</H2>
      <p>A modern LLM is the marriage of both lessons: the <strong>next-token-prediction goal</strong> from the Markov era, run on a <strong>giant neural network with attention</strong>, trained on an enormous slice of the internet. It&apos;s still, fundamentally, predicting the next token — just with a vast, learned memory instead of a two-word window.</p>
      <p>One surprise fell out of scale: <strong>in-context learning</strong>. Show a big model a couple of examples of a task right in the prompt, and it does the task — without any retraining. It was never explicitly taught to do this; the ability emerged from getting good at prediction. It&apos;s why <em>how you prompt</em> matters so much.</p>

      <LessonPredict
        prompt="A model is trained only to produce the most plausible next token. What does that predict about its failures?"
        choices={[
          "It will refuse when unsure",
          "It will sometimes state a confident, fluent falsehood",
          "It will only ever repeat its training text word-for-word",
        ]}
        answer={1}
        reveal="Confident falsehoods — 'hallucinations.' Nothing in 'predict the plausible next token' checks the answer against reality. A made-up citation in the right format is highly plausible text, so the model will produce it, fluently and without hesitation. Fluency and truth are different targets, and it's only ever optimizing the first."
      />

      <Note>This one fact explains a lot. Because it&apos;s trained to produce <strong>plausible</strong> continuations, it&apos;s fluent and often right — and it will also state a confident, well-formed <em>falsehood</em>, because nothing in &ldquo;predict the next token&rdquo; checks the answer against the truth. Use it where plausible-and-usually-right is enough, and verify it where being wrong is expensive.</Note>
    </LessonShell>
  );
}
