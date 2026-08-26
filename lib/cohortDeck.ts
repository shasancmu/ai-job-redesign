// Builds the "What the room did" summary deck for a cohort's run of a supported
// exercise (paired or solo). Aggregation (pairs, per-cell tallies) happens here;
// the qualitative themes are narrated by cohortSynthesisAI. Returns Slide[] for
// DeckPresenter. Server-only (uses the service-role client passed in).

import type { Slide, NetNode, NetEdge, DeckBar } from "@/lib/deckTypes";
import { cohortSynthesisAI } from "@/lib/ai";
import { AI_CELLS, HUMAN_CELLS, allInterviewNotes } from "@/lib/exercise";

export type SummaryExercise = "job" | "workflow" | "solo" | "workflow-solo";

const FRAMEWORK = {
  job: "the 2x4 AI x Human model: AI handles Search, Structure, Think, and Translate; humans Lead, Own, Judge, and Integrate.",
  workflow: "redesigning a workflow so each step is owned by a human, AI, or both, to make it faster and sharper without losing human judgment.",
};

// Per-exercise config: where the data lives, whether it's paired, and copy.
const META: Record<SummaryExercise, { source: "workspaces" | "workflow_docs"; paired: boolean; title: string; framework: string }> = {
  job: { source: "workspaces", paired: true, title: "Redesign your job", framework: FRAMEWORK.job },
  solo: { source: "workspaces", paired: false, title: "Redesign your job with AI", framework: FRAMEWORK.job },
  workflow: { source: "workflow_docs", paired: true, title: "Redesign your workflow", framework: FRAMEWORK.workflow },
  "workflow-solo": { source: "workflow_docs", paired: false, title: "Redesign your workflow with AI", framework: FRAMEWORK.workflow },
};

export const SUMMARY_EXERCISES: { key: SummaryExercise; label: string }[] = [
  { key: "job", label: "Redesign your job (paired)" },
  { key: "workflow", label: "Redesign your workflow (paired)" },
  { key: "solo", label: "Redesign your job with AI" },
  { key: "workflow-solo", label: "Redesign your workflow with AI" },
];

function clean(s: any): string {
  return String(s || "").replace(/\s+/g, " ").trim();
}

// Build the whole deck. Returns null when the cohort has no usable data.
export async function buildCohortDeck(
  admin: any,
  cohort: string,
  exercise: SummaryExercise,
  cohortName: string
): Promise<Slide[] | null> {
  const meta = META[exercise];
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, host_id, guest_id, status")
    .eq("cohort", cohort)
    .eq("exercise", exercise);
  // Paired exercises need both partners; solo needs a host.
  const relevant = ((sessions as any[]) || []).filter((s) => s.host_id && (meta.paired ? s.guest_id : true));
  if (relevant.length === 0) return null;

  // Names.
  const ids = [...new Set(relevant.flatMap((s) => (meta.paired ? [s.host_id, s.guest_id] : [s.host_id])).filter(Boolean))];
  const { data: profs } = await admin.from("profiles").select("id, display_name").in("id", ids);
  const nameById = new Map<string, string>(((profs as any[]) || []).map((p) => [p.id, p.display_name || "Someone"]));

  // Pairs network (paired only): each pair a distinct color; an edge per session.
  const nodes = new Map<string, NetNode>();
  const edges: NetEdge[] = [];
  if (meta.paired) {
    relevant.forEach((s, i) => {
      for (const uid of [s.host_id, s.guest_id]) {
        if (!nodes.has(uid)) nodes.set(uid, { id: uid, label: nameById.get(uid) || "Someone", group: i });
        else nodes.get(uid)!.group = i;
      }
      edges.push({ a: s.host_id, b: s.guest_id });
    });
  }

  let humanBars: DeckBar[] = [];
  let aiBars: DeckBar[] = [];
  let balanceTitle = "Where the room drew the line";
  const digestBlocks: string[] = [];

  if (meta.source === "workspaces") {
    const { data: wss } = await admin
      .from("workspaces")
      .select("session_id, author_id, owner_job_title, real_job, insight, interview_notes, interview_notes_value, grid, plan")
      .in("session_id", relevant.map((s) => s.id));
    const tally: Record<string, number> = {};
    for (const ws of ((wss as any[]) || [])) {
      const grid = (ws.grid as Record<string, string[]>) || {};
      for (const c of [...HUMAN_CELLS, ...AI_CELLS]) tally[c.key] = (tally[c.key] || 0) + (grid[c.key] || []).filter(Boolean).length;
      const plan = ws.plan || {};
      const block = [
        clean(ws.owner_job_title) && `Role: ${clean(ws.owner_job_title)}.`,
        clean(ws.real_job) && `Real job: ${clean(ws.real_job)}.`,
        clean(ws.insight) && `Insight: ${clean(ws.insight)}.`,
        HUMAN_CELLS.flatMap((c) => grid[c.key] || []).filter(Boolean).length && `Kept human: ${HUMAN_CELLS.flatMap((c) => grid[c.key] || []).filter(Boolean).slice(0, 6).join("; ")}.`,
        AI_CELLS.flatMap((c) => grid[c.key] || []).filter(Boolean).length && `Gave AI: ${AI_CELLS.flatMap((c) => grid[c.key] || []).filter(Boolean).slice(0, 6).join("; ")}.`,
        Array.isArray(plan.human) && plan.human.length && `Plan (human): ${plan.human.map((h: any) => clean(h.task)).filter(Boolean).slice(0, 5).join("; ")}.`,
        Array.isArray(plan.ai) && plan.ai.length && `Plan (AI): ${plan.ai.map((a: any) => clean(a.task)).filter(Boolean).slice(0, 5).join("; ")}.`,
        clean(allInterviewNotes(ws)).slice(0, 400) && `Notes: ${clean(allInterviewNotes(ws)).slice(0, 400)}`,
      ].filter(Boolean).join(" ");
      if (block) digestBlocks.push(block);
    }
    humanBars = HUMAN_CELLS.map((c) => ({ label: c.label, value: tally[c.key] || 0, group: 0 }));
    aiBars = AI_CELLS.map((c) => ({ label: c.label, value: tally[c.key] || 0, group: 2 }));
  } else {
    const { data: docs } = await admin
      .from("workflow_docs")
      .select("session_id, name, why, steps, analysis, stop_start")
      .in("session_id", relevant.map((s) => s.id));
    let human = 0, ai = 0, both = 0;
    for (const doc of ((docs as any[]) || [])) {
      const analysis = doc.analysis || {};
      const flow: any[] = (Array.isArray(analysis.flow) && analysis.flow.length ? analysis.flow : doc.steps) || [];
      for (const st of flow) {
        if (st?.role === "human") human++;
        else if (st?.role === "ai") ai++;
        else if (st?.role === "both") both++;
      }
      const block = [
        clean(doc.name) && `Workflow: ${clean(doc.name)}.`,
        clean(doc.why) && `Why redesign it: ${clean(doc.why)}.`,
        clean(analysis.summary) && `Redesign: ${clean(analysis.summary)}.`,
        Array.isArray(analysis.opportunities) && analysis.opportunities.length && `Opportunities: ${analysis.opportunities.map((o: any) => clean(o.title)).filter(Boolean).slice(0, 5).join("; ")}.`,
        clean(doc.stop_start) && `Stop/start: ${clean(doc.stop_start)}.`,
      ].filter(Boolean).join(" ");
      if (block) digestBlocks.push(block);
    }
    balanceTitle = "Who owns each step, across the room";
    humanBars = [
      { label: "Human owns", value: human, group: 0 },
      { label: "Human + AI", value: both, group: 4 },
      { label: "AI owns", value: ai, group: 2 },
    ];
    aiBars = [];
  }

  if (digestBlocks.length === 0) return null;

  const participantCount = ids.length;
  const pairCount = meta.paired ? relevant.length : 0;

  const synth = await cohortSynthesisAI({
    exercise,
    framework: meta.framework,
    participantCount,
    pairCount,
    digest: digestBlocks.join("\n\n"),
  }).catch(() => null);

  // ---- Assemble slides ----------------------------------------------------
  let n = 0;
  const id = () => `co${n++}`;
  const slides: Slide[] = [];
  const people = `${participantCount} ${participantCount === 1 ? "person" : "people"}`;

  slides.push({
    id: id(),
    type: "title",
    title: cohortName,
    subtitle: `${meta.title}: what the room did together. ${people}${meta.paired ? `, ${pairCount} pair${pairCount === 1 ? "" : "s"}` : ""}.`,
  });

  if (synth?.headline) slides.push({ id: id(), type: "quote", quote: synth.headline, attribution: cohortName });

  if (meta.paired) {
    slides.push({
      id: id(),
      type: "network",
      title: "Who worked with whom",
      subtitle:
        exercise === "workflow"
          ? `${pairCount} pair${pairCount === 1 ? "" : "s"} mapped and redesigned a workflow together.`
          : `${pairCount} pair${pairCount === 1 ? "" : "s"} interviewed and redesigned for each other.`,
      nodes: [...nodes.values()],
      edges,
    });
  }

  const balanceBars = [...humanBars, ...aiBars].filter((b) => b.value > 0);
  if (balanceBars.length) {
    slides.push({
      id: id(),
      type: "barlist",
      title: balanceTitle,
      subtitle: meta.source === "workspaces" ? "How often the room assigned each kind of work (green = human, gold = AI)." : "Steps the room assigned to a human, to AI, or to both.",
      bars: balanceBars,
    });
  }

  const cardsFrom = (title: string, items: { [k: string]: string }[] | undefined, a: string, b: string) => {
    const cards = (items || []).map((it) => ({ heading: it[a], text: it[b] })).filter((c) => c.heading);
    if (cards.length) slides.push({ id: id(), type: "cards", title, cards });
  };

  cardsFrom("What people kept human", synth?.keptHuman, "theme", "detail");
  cardsFrom("What they handed to AI", synth?.gaveAI, "theme", "detail");
  cardsFrom(meta.paired ? "What the conversations kept returning to" : "What people focused on", synth?.conversationFocus, "theme", "detail");
  cardsFrom("What the room learned", synth?.learnings, "title", "detail");

  return slides;
}
