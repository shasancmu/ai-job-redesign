// Live Room Intelligence: gather the cohort's IN-PROGRESS work into one text
// digest the AI can read all at once. Server-only (service-role client passed in).

import { AI_CELLS, HUMAN_CELLS, allInterviewNotes } from "@/lib/exercise";

function clean(s: any): string {
  return String(s || "").replace(/\s+/g, " ").trim();
}

export async function gatherRoomDigest(
  admin: any,
  cohort: string
): Promise<{ digest: string; participantCount: number; activityCount: number }> {
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, host_id, guest_id, exercise, hidden")
    .eq("cohort", cohort);
  const live = ((sessions as any[]) || []).filter((s) => !s.hidden);
  if (!live.length) return { digest: "", participantCount: 0, activityCount: 0 };

  const ids = live.map((s) => s.id);
  const [{ data: wss }, { data: docs }] = await Promise.all([
    admin
      .from("workspaces")
      .select("session_id, author_id, owner_job_title, real_job, insight, interview_notes, interview_notes_value, grid, plan, new_job_description, canvas")
      .in("session_id", ids),
    admin.from("workflow_docs").select("session_id, name, why, analysis, stop_start").in("session_id", ids),
  ]);

  const idsForNames = [
    ...new Set([
      ...((wss as any[]) || []).map((w) => w.author_id),
      ...live.flatMap((s) => [s.host_id, s.guest_id]),
    ].filter(Boolean)),
  ];
  const { data: profs } = await admin.from("profiles").select("id, display_name").in("id", idsForNames);
  const nameById = new Map<string, string>(((profs as any[]) || []).map((p) => [p.id, p.display_name || "Someone"]));
  const docBySession = new Map<string, any>(((docs as any[]) || []).map((d) => [d.session_id, d]));

  const blocks: string[] = [];

  for (const ws of ((wss as any[]) || [])) {
    const name = nameById.get(ws.author_id) || "Someone";
    const grid = (ws.grid as Record<string, string[]>) || {};
    const human = HUMAN_CELLS.flatMap((c) => grid[c.key] || []).filter(Boolean);
    const ai = AI_CELLS.flatMap((c) => grid[c.key] || []).filter(Boolean);
    const plan = ws.plan || {};
    const canvas = ws.canvas || {};
    const parts = [
      clean(ws.owner_job_title) && `role: ${clean(ws.owner_job_title)}`,
      clean(ws.real_job) && `real job: ${clean(ws.real_job)}`,
      clean(ws.insight) && `insight: ${clean(ws.insight)}`,
      human.length && `keeps human: ${human.slice(0, 6).join("; ")}`,
      ai.length && `hands to AI: ${ai.slice(0, 6).join("; ")}`,
      Array.isArray(plan.human) && plan.human.length && `plan (human): ${plan.human.map((h: any) => clean(h.task)).filter(Boolean).slice(0, 4).join("; ")}`,
      clean(ws.new_job_description) && `redesign: ${clean(ws.new_job_description).slice(0, 300)}`,
      clean(canvas.synthesis) && `synthesis: ${clean(canvas.synthesis).slice(0, 300)}`,
      clean(allInterviewNotes(ws)).slice(0, 300) && `notes: ${clean(allInterviewNotes(ws)).slice(0, 300)}`,
    ].filter(Boolean).join(". ");
    if (parts) blocks.push(`${name}: ${parts}.`);
  }

  for (const s of live) {
    const doc = docBySession.get(s.id);
    if (!doc) continue;
    const name = nameById.get(s.host_id) || "Someone";
    const a = doc.analysis || {};
    const parts = [
      clean(doc.name) && `workflow: ${clean(doc.name)}`,
      clean(doc.why) && `why redesign it: ${clean(doc.why)}`,
      clean(a.summary) && `redesign: ${clean(a.summary).slice(0, 300)}`,
      clean(doc.stop_start) && `stop/start: ${clean(doc.stop_start).slice(0, 200)}`,
    ].filter(Boolean).join(". ");
    if (parts) blocks.push(`${name}: ${parts}.`);
  }

  const participantCount = new Set(live.flatMap((s) => [s.host_id, s.guest_id]).filter(Boolean)).size;
  const digest = blocks.join("\n").slice(0, 14000);
  return { digest, participantCount, activityCount: live.length };
}
