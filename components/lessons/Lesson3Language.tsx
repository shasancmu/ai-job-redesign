"use client";

import LessonShell, { H2, Note, Milestone } from "@/components/lessons/LessonShell";
import MarkovDemo from "@/components/lessons/MarkovDemo";
import LessonPredict from "@/components/lessons/LessonPredict";

export default function Lesson3Language({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Predicting the next word" topic="language models: the Markov / n-gram idea, its short-memory limit, the Transformer and attention, and how modern large language models predict the next token">
      <p>Language seemed hopeless for rules, too many exceptions. The trick that cracked it is almost silly in its simplicity: <strong>predict the next word</strong>. Do that well enough, over and over, and you can write.</p>

      <H2>The old way: look at the last few words</H2>
      <p>The earliest statistical language models used the <strong>Markov</strong> idea (also called n-grams): to guess the next word, just look at the last one or two words and pick whatever most often followed them in a big pile of text. No grammar, no meaning, just counting.</p>

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

      <H2>The new way: attention</H2>
      <p>The leap was an architecture that lets every word <strong>look at every other word</strong> and decide which ones matter, called <strong>attention</strong>. Now the &ldquo;memory&rdquo; is long and <em>learned</em>: the model can connect a pronoun to a name thousands of words back.</p>
      <Milestone year="2017">&ldquo;Attention Is All You Need&rdquo; introduced the Transformer, the architecture behind essentially every modern large language model.</Milestone>

      <H2>Putting it together</H2>
      <p>A modern LLM is the marriage of both lessons: the <strong>next-word-prediction goal</strong> from the Markov era, run on a <strong>giant neural network with attention</strong>, trained on an enormous slice of the internet. It&apos;s still, fundamentally, predicting the next token, just with a vast, learned memory instead of a two-word window.</p>

      <Note>This one fact explains a lot. Because it&apos;s trained to produce <strong>plausible</strong> continuations, it&apos;s fluent and often right, and it will also state a confident, well-formed <em>falsehood</em>, because nothing in &ldquo;predict the next word&rdquo; checks the answer against the truth.</Note>
    </LessonShell>
  );
}
