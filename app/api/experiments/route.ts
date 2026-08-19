import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { AI_ENABLED, experimentProposeAI, experimentNarrateAI, syntheticSimulateAI, syntheticJudgeAI } from "@/lib/ai";
import { analyze, successForSession, flowLabel, PERSONAS, type Experiment, type Variant } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Facilitator-only experiment control plane. Statistics are computed here in
// code; the LLM is used only to propose variants and narrate results.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!isAdmin(user.email)) return Response.json({ error: "Facilitators only." }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const action = String(body.action || "");
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Experiment storage isn't configured." }, { status: 500 });
  }

  try {
    if (action === "list") {
      const { data: exps } = await admin.from("experiments").select("*").order("created_at", { ascending: false });
      const withStats = await Promise.all((exps || []).map(async (e: any) => ({
        // Synthetic experiments have no real sessions; their stats live in result.
        ...e,
        analysis: e.mode === "synthetic" ? e.result?.analysis || null : await computeAnalysis(admin, e),
        _narrative: e.result?.narrative || "",
      })));
      return Response.json({ experiments: withStats });
    }

    if (action === "propose") {
      if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
      const flow = String(body.flow || "");
      const { data: past } = await admin.from("experiments").select("hypothesis, result, status").eq("flow", flow).in("status", ["concluded", "adopted", "rejected"]).limit(6);
      const draft = await experimentProposeAI({
        flow,
        flowLabel: flowLabel(flow),
        target: body.target === "report" ? "report" : "interview",
        goal: body.goal,
        past: (past || []).map((p: any) => ({ hypothesis: p.hypothesis, outcome: p.status })),
      });
      if (!draft) return Response.json({ error: "Couldn't draft a proposal. Try again." }, { status: 502 });
      return Response.json({ draft });
    }

    if (action === "create") {
      const flow = String(body.flow || "");
      const variants: Variant[] = [
        { key: "control", label: "Control", nudge: "" },
        { key: "treatment", label: String(body.treatmentLabel || "Treatment").slice(0, 60), nudge: String(body.treatmentNudge || "").slice(0, 600) },
      ];
      const { data, error } = await admin.from("experiments").insert({
        flow,
        name: String(body.name || "Untitled experiment").slice(0, 120),
        hypothesis: String(body.hypothesis || "").slice(0, 600),
        metric: ["completion", "depth", "shared"].includes(body.metric) ? body.metric : "completion",
        depth_threshold: Math.max(2, Math.min(12, Number(body.depth_threshold) || 4)),
        variants,
        min_per_arm: Math.max(20, Math.min(2000, Number(body.min_per_arm) || 100)),
        status: "proposed",
        target: body.target === "report" ? "report" : "interview",
        mode: body.mode === "synthetic" ? "synthetic" : "human",
        created_by: body.created_by === "human" ? "human" : "agent",
      }).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ experiment: data });
    }

    if (action === "launch") {
      const { error } = await admin.from("experiments").update({ status: "running", launched_at: new Date().toISOString() }).eq("id", body.id).eq("status", "proposed");
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "analyze") {
      const { data: exp } = await admin.from("experiments").select("*").eq("id", body.id).maybeSingle();
      if (!exp) return Response.json({ error: "Not found." }, { status: 404 });
      const analysis = await computeAnalysis(admin, exp);
      let narrative = "";
      if (AI_ENABLED) { try { narrative = await experimentNarrateAI({ name: exp.name, metric: exp.metric, analysis }); } catch {} }
      await admin.from("experiments").update({ result: { analysis, narrative, at: new Date().toISOString() } }).eq("id", exp.id);
      return Response.json({ analysis, narrative });
    }

    if (action === "simulate") {
      if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
      const { data: exp } = await admin.from("experiments").select("*").eq("id", body.id).maybeSingle();
      if (!exp) return Response.json({ error: "Not found." }, { status: 404 });
      const reps = Math.max(1, Math.min(4, Number(body.reps) || 2));
      const label = flowLabel(exp.flow);

      // One job per persona x rep x variant.
      const jobs: { variant_key: string; nudge: string; persona: string }[] = [];
      for (const p of PERSONAS) for (let r = 0; r < reps; r++) for (const v of exp.variants || []) jobs.push({ variant_key: v.key, nudge: v.nudge, persona: p.persona });

      const rows: { variant_key: string; success: boolean }[] = [];
      const run = async (j: any) => {
        try {
          const artifact = await syntheticSimulateAI({ flowLabel: label, target: exp.target, nudge: j.nudge, persona: j.persona });
          const verdict = await syntheticJudgeAI({ flowLabel: label, target: exp.target, metric: exp.metric, persona: j.persona, artifact });
          rows.push({ variant_key: j.variant_key, success: verdict.success });
        } catch { /* skip a failed job */ }
      };
      // Bounded concurrency so we stay under the request timeout.
      const CONC = 8;
      for (let i = 0; i < jobs.length; i += CONC) await Promise.all(jobs.slice(i, i + CONC).map(run));

      const analysis = analyze(exp, exp.variants || [], rows);
      let narrative = "";
      try { narrative = await experimentNarrateAI({ name: exp.name + " (synthetic)", metric: exp.metric, analysis }); } catch {}
      const result = { analysis, narrative, kind: "synthetic", reps, at: new Date().toISOString() };
      await admin.from("experiments").update({ result }).eq("id", exp.id);
      return Response.json({ analysis, narrative, kind: "synthetic" });
    }

    if (action === "promote") {
      const { data: exp } = await admin.from("experiments").select("*").eq("id", body.id).maybeSingle();
      if (!exp) return Response.json({ error: "Not found." }, { status: 404 });
      const { data, error } = await admin.from("experiments").insert({
        flow: exp.flow,
        name: (exp.name || "Experiment").replace(/\s*\(synthetic\)\s*$/i, "").slice(0, 108) + " (live)",
        hypothesis: exp.hypothesis,
        metric: exp.metric,
        depth_threshold: exp.depth_threshold,
        variants: exp.variants,
        min_per_arm: exp.min_per_arm,
        target: exp.target,
        mode: "human",
        status: "proposed",
        created_by: "human",
      }).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ experiment: data });
    }

    if (action === "adopt" || action === "reject") {
      const status = action === "adopt" ? "adopted" : "rejected";
      const { error } = await admin.from("experiments").update({ status, concluded_at: new Date().toISOString() }).eq("id", body.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Request failed." }, { status: 500 });
  }
}

// Join assignments to each session's current state and score the metric per arm.
async function computeAnalysis(admin: any, exp: Experiment) {
  const { data: assigns } = await admin.from("experiment_assignments").select("session_id, variant_key").eq("experiment_id", exp.id);
  const rowsRaw = assigns || [];
  const sids = [...new Set(rowsRaw.map((a: any) => a.session_id))];
  if (sids.length === 0) return analyze(exp, exp.variants || [], []);

  const { data: sessions } = await admin.from("sessions").select("id, status, public_token, host_id").in("id", sids);
  const { data: wss } = await admin.from("workspaces").select("session_id, canvas, author_id").in("session_id", sids);
  const sById = new Map((sessions || []).map((s: any) => [s.id, s]));
  const canvasBySession = new Map<string, any>();
  for (const w of wss || []) {
    const s: any = sById.get(w.session_id);
    if (s && w.author_id === s.host_id) canvasBySession.set(w.session_id, w.canvas);
    else if (!canvasBySession.has(w.session_id)) canvasBySession.set(w.session_id, w.canvas);
  }
  const rows = rowsRaw
    .filter((a: any) => sById.has(a.session_id))
    .map((a: any) => ({
      variant_key: a.variant_key,
      success: successForSession(exp.metric, exp.depth_threshold, sById.get(a.session_id), canvasBySession.get(a.session_id) || {}),
    }));
  return analyze(exp, exp.variants || [], rows);
}
