"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

// Sourced from Hasan, "Research, Strategy" — "The structure of an academic
// paper" (nested parallelism), "Abstract" and "Introduction" (the hourglass and
// the six/five components), "Title", and "How a paper should look".
export default function ResLesson3Paper({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="The anatomy of a paper" topic="how an academic paper is structured, from Hasan's 'Research, Strategy': the hourglass (broad motivation, narrow to the puzzle/solution/findings, widen to implications); nested parallelism where the same six components repeat across abstract, introduction, and body; the six-sentence abstract (motivation, puzzle, solution, data, results, implications); the five/six-paragraph introduction; the nine sections; and how to write a title that communicates and is findable">
      <p>An academic paper isn&apos;t a mystery novel — you don&apos;t hide the ending. It&apos;s a persuasive text with a shape so standard that a good reader can navigate it in the dark. Learn the shape and the writing gets dramatically easier.</p>

      <H2>The hourglass</H2>
      <p>Every paper is an <strong>hourglass</strong>. It opens <em>broad</em> — the big motivation, why anyone should care. It <em>narrows</em> to a specific puzzle, then your solution, then your findings. And it <em>widens</em> again at the end — the implications, who benefits, how we should now see the world. Broad → narrow → broad.</p>

      <H2>Nested parallelism: the same six things, three times</H2>
      <p>The paper repeats <strong>six core components</strong> at three levels of zoom. The abstract states them in one sentence each; the introduction expands each into a paragraph; the body sections elaborate each in full. Same order every time:</p>
      <Note><strong>1 Motivation</strong> — why the topic matters &nbsp;·&nbsp; <strong>2 Puzzle</strong> — the specific problem or gap &nbsp;·&nbsp; <strong>3 Solution</strong> — your approach or hypothesis &nbsp;·&nbsp; <strong>4 Data</strong> — the evidence you use &nbsp;·&nbsp; <strong>5 Results</strong> — what you found &nbsp;·&nbsp; <strong>6 Implications</strong> — why it matters</Note>
      <p>Why this works: the repetition <em>reinforces</em> the argument, it&apos;s <em>scalable</em> (a reader can skim the abstract, read the intro, or dive into results and always land in the same structure), and it&apos;s <em>efficient</em> — every section flows because the reader already knows the order.</p>

      <H2>The abstract: six sentences</H2>
      <p>The abstract is a microcosm of the whole paper — on average <strong>six tight sentences</strong>, one per component. Be concrete: give effect sizes, not adjectives. Get this right and the rest of the paper is just the abstract, expanded.</p>

      <H2>The introduction: mirror it in paragraphs</H2>
      <p>The introduction is the abstract at higher resolution — one <strong>paragraph per component</strong>. Paragraph 1 hooks with motivation. Paragraph 2 lays out the puzzle — and often states the <em>alternative, commonly-accepted view</em> you&apos;re about to complicate. Paragraph 3 is your solution. Paragraph 4 is the findings, with numbers. Paragraph 5 is the implications. The intro is the most-read section of your paper; readers decide here whether to go deeper.</p>

      <LessonPredict
        prompt="In the five-paragraph introduction, what is the job of the SECOND paragraph?"
        choices={[
          "Summarize your results up front",
          "State the puzzle — often by naming the conventional view you'll complicate",
          "Thank your co-authors and funders",
        ]}
        answer={1}
        reveal="The puzzle. After the motivation hook, paragraph two narrows to the specific problem — and the strongest version names the null: the view most people hold, which your paper is about to trouble. Setting up that expectation is what makes the later 'but we find…' land. Miss it and your finding has nothing to push against."
      />

      <H2>The nine sections</H2>
      <p>Assembled, a paper has a standard skeleton: <strong>Title · Authors · Abstract · Introduction · Theory · Data &amp; Methods · Results · Discussion · Conclusion</strong>, then references, and figures/tables (often at the end, one per page, so a reader can find them fast). Don&apos;t get creative with the container — readers have firm expectations, and fighting them just costs you attention you need for the ideas.</p>

      <H2>The title: findable, not clever</H2>
      <p>In the internet age a title has one job: tell a reader — and a search engine — exactly what they&apos;ll get, so the right people find it and read on. Cleverness that hides the content is a tax. Hasan&apos;s own cautionary example: one of his best papers went out as <em>&ldquo;The Mechanics of Social Capital and Academic Performance at an Indian College.&rdquo;</em> What does &ldquo;mechanics of social capital&rdquo; mean? Are the results only about Indian colleges?</p>

      <LessonPredict
        prompt="Which retitling of that paper would serve the work better?"
        choices={[
          "Social Capital Dynamics: A Microsociological Investigation",
          "The Long-term Effects of Peers, Friends, and Study Partners on Academic Performance",
          "Networks and Grades: New Evidence",
        ]}
        answer={1}
        reveal="The middle one. It says plainly what the reader learns (how peers, friends, and study partners shape academic performance over time), uses keywords the right audience actually searches, and drops the jargon and the parochial 'Indian College' framing that made the finding look narrower than it is. A title should communicate the benefit and be findable — test a few on a colleague and see which conveys the big idea fastest."
      />

      <Note>Draft the abstract first, as six sentences. Everything after that — intro, sections, tables — is those six components, expanded and kept in the same order. The structure isn&apos;t a constraint; it&apos;s the scaffolding that lets a reader follow a hard argument without getting lost.</Note>
    </LessonShell>
  );
}
