"use client";

import LessonShell, { H2, Note } from "@/components/lessons/LessonShell";
import LessonPredict from "@/components/lessons/LessonPredict";

// Sourced from Hasan, "Research, Strategy" — "Literature Reviews" (the dual
// role; the gap), "Publishing" (the funnel and lottery; choosing a journal;
// rejection; Revise & Resubmit as an exam; reviewing), "Presenting your
// research" (the five-part structure; the three Q&A types), and "Teams" (the
// weakest-link problem; complementary skills; the master builder).
export default function ResLesson6Publish({ session }: { me: string; session: any; initialWorkspace: any }) {
  return (
    <LessonShell session={session} title="Getting published & heard" topic="positioning, publishing, presenting, and collaborating, from Hasan's 'Research, Strategy': the two roles of a literature review (support your tested claims; support the untested foundational premises) and finding the gap; the publishing process as a low-probability funnel where reviewers and an editor decide; choosing a journal (fit vs prestige vs speed); handling rejection and treating a Revise & Resubmit as an exam answered via a revision document; presenting research in five parts (summary, motivation, puzzle, theory, data & results, who cares) and the three recurring Q&A types ('isn't this just X?', 'you're missing Y', 'why should we care?'); and co-authoring as complementary skills bounded by the weakest link">
      <p>A finished paper isn&apos;t a published, read, and cited paper. The last stretch — positioning it in the literature, surviving review, presenting it, and collaborating well — is its own craft, and it&apos;s where a lot of good work quietly dies.</p>

      <H2>The literature review does two jobs</H2>
      <p>A lit review isn&apos;t a summary — it&apos;s load-bearing. It does two things. First, it <strong>supports the claims you test</strong>: it anchors your work in the ongoing conversation and shows your claims aren&apos;t speculative. Second — and easy to forget — it <strong>supports the foundational premises you <em>don&apos;t</em> test</strong>: the logical bridges your argument leans on but never puts in a regression. If your paper assumes seasoned advisors carry valuable tacit knowledge, you don&apos;t test that; you cite the work that established it.</p>
      <p>Along the way, a good review establishes your <em>credibility</em> (you know the field), and by synthesizing rather than listing, it surfaces the <strong>gap</strong> that becomes your contribution. Tip from the book: summarize every paper you read in the canvas form — <em>IF X THEN Y, ESPECIALLY/EXCEPT WHEN Z, BECAUSE.</em></p>

      <H2>Publishing is a funnel — and a lottery</H2>
      <p>Top journals accept roughly <strong>3–7%</strong> of submissions. A paper runs a gauntlet: managing editor → reviewers → an editor who aggregates their votes and decides. Some editors go with the <em>median</em> reviewer, some the harsh <em>minimum</em> — so outcomes are noisy. You cannot out-write a 5% acceptance rate on any single paper; the only durable strategy is a <strong>pipeline</strong> of good papers, each with its odds raised as high as you can get them.</p>

      <H2>Choosing a journal, and handling rejection</H2>
      <p>Weigh <strong>fit</strong> (does your paper match the journal&apos;s scope and readers?), <strong>prestige</strong>, and <strong>speed</strong> — the top journals bring status and fierce competition; niche ones bring faster decisions and a targeted audience. Rejection is the norm, not the exception. Diagnose which kind it was — poor fit, methodological flaw, thin theoretical contribution, or unclear writing — then revise and resubmit elsewhere. Many great papers were rejected several times first.</p>

      <LessonPredict
        prompt="You get a 'Revise & Resubmit.' What is it, really — and how should you treat it?"
        choices={[
          "A polite rejection; move on to another journal",
          "An exam: the reviewers pose questions, and you pass by answering every one, systematically, in a revision document",
          "A green light; make a few edits and it's basically accepted",
        ]}
        answer={1}
        reveal="An exam. An R&R is a major step forward — most accepted papers went through several — but it's conditional. Build a revision document listing every reviewer comment and your explicit response; treat it as a dialogue, engaging even the concerns you disagree with and giving clear reasoning where you don't fully comply. A systematic, organized response signals professionalism and is what turns an R&R into an acceptance."
      />

      <H2>Presenting: five parts</H2>
      <p>A talk has a rhythm. In order: <strong>Summary</strong> (in one minute, what is this and why are we here?), <strong>Motivation</strong> (why study it?), <strong>Puzzle</strong> (the research question, framed as curiosity), <strong>Theory</strong> (what you expect and why), <strong>Data &amp; Results</strong> (be selective — only what answers the question), and <strong>Who Cares?</strong> (circle back to the big picture). Rehearse until it&apos;s natural, and know the timing of every section cold.</p>

      <H2>The three questions you&apos;ll always get</H2>
      <p>Q&amp;A leaves a bigger impression than the talk. First, <em>listen</em> — absorb the question, restate it if needed. Nearly every question is one of three:</p>
      <Note><strong>&ldquo;Isn&apos;t this just X?&rdquo;</strong> — a novelty challenge. &nbsp; <strong>&ldquo;You&apos;re missing Y&rdquo;</strong> (e.g. unobserved heterogeneity) — a limitation. &nbsp; <strong>&ldquo;Why should we care?&rdquo;</strong> — the existential one.</Note>

      <LessonPredict
        prompt="A senior scholar says: 'Isn't this just the old peer-effects story with new data?' Best response?"
        choices={[
          "Insist it's completely different and move on",
          "Acknowledge the overlap, then name precisely what your work adds that X doesn't",
          "Concede the point to keep things friendly",
        ]}
        answer={1}
        reveal="Acknowledge, then differentiate. 'While X and my work address a similar phenomenon, my study adds Y by focusing on…' You lose credibility by denying a real overlap, and you lose the contribution by conceding entirely. The move is to grant the connection and then sharpen exactly where you go beyond it — which is really just restating your unique insight against the closest null. Humility on genuine gaps, confidence where your work stands."
      />

      <H2>Working as a team</H2>
      <p>The lone <strong>master builder</strong> controls every detail but can&apos;t scale, and any weakness — data, writing, analysis — shows glaringly. Most research is co-authored for exactly that reason: complementary skills (one frames the big picture, another lives in the data), shared learning, and a bigger pipeline. But a paper is only as strong as its <strong>weakest link</strong> — a disengaged or unreliable co-author caps the whole thing — so choose collaborators for trust and reliability, align on goals and roles early, and communicate often.</p>

      <Note>The work isn&apos;t done when the paper is done. Position it so a reader sees the gap, treat every R&R as an exam to be passed, present it in five parts and welcome the three questions, and build a team whose weakest link is still strong. That&apos;s how good research actually reaches the world.</Note>
    </LessonShell>
  );
}
