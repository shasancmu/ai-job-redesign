import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { moduleByExercise } from "@/lib/modules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// What completion actually is, as opposed to what we count.
//
// A room marks a session `done` when the learner *navigates to* its last step.
// That is not the same as finishing: SoloRoom builds the reimagined role at step
// 3 of 4 and marks done at step 4 ("Make it real"), and NegotiationRoom settles
// the deal at step 3 and marks done at step 4 ("Debrief"). Someone who did the
// whole exercise, read their artifact and closed the tab is recorded as a
// drop-out. Eight rooms never mark done at all, so their runs can only ever
// count as incomplete.
//
// This measures the thing itself: did a run produce an artifact?
//
// And it segments, because the platform-wide figure is meaningless while the
// person building it is also its heaviest user: 37 accounts against 654 runs is
// seventeen runs each, which is a developer testing, not a cohort learning. A
// builder abandons runs constantly and on purpose. Only the "others" block below
// is evidence of anything. Read-only.

// Real content, not an empty scaffold the room wrote on first save.
function hasArtifact(canvas: any, plan: any): boolean {
  const p = plan || canvas?.plan;
  if (p && (p.headline || p.summary || (p.human?.length || 0) + (p.ai?.length || 0) > 0)) return true;
  if (!canvas || typeof canvas !== "object") return false;
  const x = canvas.xray;
  if (x && (x.headline || (x.tasks?.length || 0) > 0)) return true;
  const r = canvas.report;
  if (r && typeof r === "object" && Object.keys(r).length > 2) return true;
  if (canvas.study?.title || canvas.verdict || canvas.synthesis) return true;
  if (canvas.read && canvas.title) return true;
  if (canvas.result || canvas.brief || canvas.ranked) return true;
  // A canvas exercise: its grid actually filled in.
  const f = canvas.fields;
  if (f && typeof f === "object" && Object.values(f).filter(Boolean).length >= 3) return true;
  return false;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const role = await roleFor(user);
  if (!role.superadmin) return NextResponse.json({ error: "Superadmin only" }, { status: 403 });

  const db = createAdminClient();
  const { data: sessions } = await db
    .from("sessions")
    .select("id, exercise, status, host_id")
    .limit(5000);
  const { data: wss } = await db
    .from("workspaces")
    .select("session_id, canvas, plan")
    .limit(8000);

  const byId = new Map<string, { canvas: any; plan: any }>();
  for (const w of ((wss as any[]) || [])) {
    // A paired session holds a row each; either producing an artifact counts.
    const prev = byId.get(w.session_id);
    if (!prev || !hasArtifact(prev.canvas, prev.plan)) byId.set(w.session_id, { canvas: w.canvas, plan: w.plan });
  }

  type Row = { runs: number; marked: number; real: number };
  const per = new Map<string, Row>();
  const seg = {
    you: { runs: 0, real: 0, users: new Set<string>() },
    others: { runs: 0, real: 0, users: new Set<string>() },
  };
  let runs = 0, marked = 0, real = 0, undercounted = 0;

  for (const s of ((sessions as any[]) || [])) {
    const w = byId.get(s.id);
    const made = !!w && hasArtifact(w.canvas, w.plan);
    const isDone = s.status === "done";
    runs++; if (isDone) marked++; if (made) real++;
    if (made && !isDone) undercounted++;

    const bucket = s.host_id === user.id ? seg.you : seg.others;
    bucket.runs++; if (made) bucket.real++;
    if (s.host_id) bucket.users.add(s.host_id);

    // Per-module rates are only meaningful for people who aren't building it.
    if (s.host_id === user.id) continue;
    const key = s.exercise || "(none)";
    const r = per.get(key) || { runs: 0, marked: 0, real: 0 };
    r.runs++; if (isDone) r.marked++; if (made) r.real++;
    per.set(key, r);
  }

  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const modules = [...per.entries()]
    .filter(([, r]) => r.runs >= 3)
    .map(([exercise, r]) => ({
      module: moduleByExercise(exercise)?.name || exercise,
      runs: r.runs,
      countedNow: `${pct(r.marked, r.runs)}%`,
      actuallyMadeSomething: `${pct(r.real, r.runs)}%`,
      hiddenRuns: r.real - r.marked,
    }))
    .sort((a, b) => b.hiddenRuns - a.hiddenRuns);

  return NextResponse.json({
    note: "Platform totals include the builder's own runs and are not evidence. Read `others`.",
    allAccounts: {
      runs,
      countedComplete: `${pct(marked, runs)}%`,
      producedAnArtifact: `${pct(real, runs)}%`,
      runsFinishedButNotCounted: undercounted,
    },
    you: {
      runs: seg.you.runs,
      producedAnArtifact: `${pct(seg.you.real, seg.you.runs)}%`,
      shareOfAllRuns: `${pct(seg.you.runs, runs)}%`,
    },
    others: {
      people: seg.others.users.size,
      runs: seg.others.runs,
      producedAnArtifact: `${pct(seg.others.real, seg.others.runs)}%`,
      runsPerPerson: seg.others.users.size ? +(seg.others.runs / seg.others.users.size).toFixed(1) : 0,
    },
    modulesExcludingYou: modules,
  });
}
