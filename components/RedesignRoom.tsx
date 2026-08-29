"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCohortPing } from "@/components/useCohortLive";
import { REDESIGN_PHASES } from "@/lib/mechanics/redesignStore";
import { moduleBeacon } from "@/lib/clientBeacon";

// A spec-driven PAIRED redesign, on the proven realtime path: phase lives on the
// `sessions` row (already realtime), each partner's canvas on their own
// `workspaces` row (already realtime). Mirrors components/Room.tsx: one channel
// per session, postgres_changes on sessions + workspaces, echo-guard on own row,
// reveal = read the partner's row.
export default function RedesignRoom({ me, spec, initialSession, initialWorkspaces, initialProfiles }: { me: string; spec: any; initialSession: any; initialWorkspaces: any[]; initialProfiles: any[] }) {
  const supabase = createClient();
  const [session, setSession] = useState<any>(initialSession);
  const [wss, setWss] = useState<any[]>(initialWorkspaces);
  const profiles: any[] = initialProfiles;
  const pingCohort = useCohortPing(session.cohort);

  const amA = session.host_id === me;
  const myWs = wss.find((w) => w.author_id === me) || { session_id: session.id, author_id: me, grid: {}, feedback: {} };
  const partnerId = amA ? session.guest_id : session.host_id;
  const partnerWs = partnerId ? wss.find((w) => w.author_id === partnerId) : null;
  const nameOf = (id?: string | null) => (id && profiles.find((p) => p.id === id)?.display_name) || "your partner";

  const phaseIdx = Math.max(0, Math.min(REDESIGN_PHASES.length - 1, session.phase || 0));
  const phase = REDESIGN_PHASES[phaseIdx];
  const activeField = useRef<string>("");

  // Drop-off funnel: entered the room, and reached the final phase (once).
  useEffect(() => { if (spec?.slug) moduleBeacon(spec.slug, "redesign", "start"); }, [spec?.slug]);
  const completedRef = useRef(false);
  useEffect(() => { if (phase?.key === "final" && spec?.slug && !completedRef.current) { completedRef.current = true; moduleBeacon(spec.slug, "redesign", "complete"); } }, [phase?.key, spec?.slug]);

  // ---- realtime: sessions (phase) + workspaces (both canvases) --------------
  useEffect(() => {
    const channel = supabase
      .channel(`rd-${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${session.id}` }, (payload: any) => {
        setSession((s: any) => ({ ...s, ...payload.new }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workspaces", filter: `session_id=eq.${session.id}` }, (payload: any) => {
        const row = payload.new;
        if (!row) return;
        // Echo-guard: ignore realtime of my OWN row while I'm editing it.
        if (row.author_id === me && activeField.current) return;
        setWss((prev) => { const i = prev.findIndex((w) => w.author_id === row.author_id); if (i >= 0) { const n = [...prev]; n[i] = { ...n[i], ...row }; return n; } return [...prev, row]; });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // Backfill: when the partner appears, refetch profiles + workspaces once.
  useEffect(() => {
    if (partnerId && !partnerWs) {
      supabase.from("workspaces").select("*").eq("session_id", session.id).then(({ data }) => { if (data) setWss(data); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  // ---- my autosave (debounced), never touches the partner's row -------------
  const saveTimer = useRef<any>(null);
  const patchMine = useCallback((patch: any) => {
    setWss((prev) => { const i = prev.findIndex((w) => w.author_id === me); const cur = i >= 0 ? prev[i] : { session_id: session.id, author_id: me, grid: {}, feedback: {} }; const next = { ...cur, ...patch }; const n = i >= 0 ? [...prev] : [...prev, next]; if (i >= 0) n[i] = next; return n; });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("workspaces").upsert({ session_id: session.id, author_id: me, ...patch, updated_at: new Date().toISOString() }, { onConflict: "session_id,author_id" });
      activeField.current = "";
    }, 600);
  }, [me, session.id, supabase]);

  // feedback written onto the PARTNER's row (their design, my reactions)
  const fbTimer = useRef<any>(null);
  function patchPartnerFeedback(fb: any) {
    if (!partnerWs?.id) return;
    setWss((prev) => prev.map((w) => (w.author_id === partnerId ? { ...w, feedback: { ...(w.feedback || {}), ...fb } } : w)));
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => { supabase.from("workspaces").update({ feedback: { ...(partnerWs.feedback || {}), ...fb }, updated_at: new Date().toISOString() }).eq("id", partnerWs.id); }, 600);
  }

  async function goToPhase(i: number) {
    const clamped = Math.max(0, Math.min(REDESIGN_PHASES.length - 1, i));
    setSession((s: any) => ({ ...s, phase: clamped }));
    await supabase.from("sessions").update({ phase: clamped, status: clamped >= REDESIGN_PHASES.length - 1 ? "done" : "active" }).eq("id", session.id);
    pingCohort();
  }

  const grid = myWs.grid || {};
  const setBucket = (key: string, items: string[]) => { activeField.current = `grid:${key}`; patchMine({ grid: { ...grid, [key]: items } }); };
  const aiBuckets = (spec.buckets || []).filter((b: any) => b.role === "ai");
  const humanBuckets = (spec.buckets || []).filter((b: any) => b.role === "human");

  const waiting = !partnerId && phaseIdx > 0;

  return (
    <div className="pb-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.emoji || "🤝"} {spec.name}</span>
        <span className="text-xs text-slate-400">You are {amA ? "Partner A" : "Partner B"} · with {nameOf(partnerId)}</span>
      </div>

      <div className="mb-4 flex items-center gap-1.5">
        {REDESIGN_PHASES.map((p, i) => <div key={p.key} className={"h-1.5 flex-1 rounded-full " + (i < phaseIdx ? "bg-ink" : i === phaseIdx ? "bg-ai" : "bg-slate-200")} />)}
      </div>
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {phaseIdx + 1} of {REDESIGN_PHASES.length}</div>
        <h1 className="mt-1 text-2xl font-bold text-ink">{phase.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{phase.subtitle}</p>
      </div>

      {!partnerId && (
        <div className="mb-4 rounded-xl border border-dashed border-line bg-mist/40 p-3 text-sm text-slate-500">
          Waiting for your partner to join with code <span className="font-mono font-bold text-ink">{session.code}</span>. Share it, or start solo and they can join.
        </div>
      )}

      {/* SETUP */}
      {phase.key === "setup" && (
        <Panel>
          <label className="lbl">Your {spec.subject} today</label>
          <p className="mb-1 text-xs text-slate-400">{spec.setupPrompt}</p>
          <textarea className="field text-sm" rows={4} value={myWs.owner_job_description || ""} onChange={(e) => { activeField.current = "own"; patchMine({ owner_job_description: e.target.value }); }} />
        </Panel>
      )}

      {/* INTERVIEW (talk) */}
      {(phase.key === "interviewA" || phase.key === "interviewB") && (() => {
        const iAmInterviewer = (phase.interviewer === "A") === amA;
        return (
          <Panel>
            {iAmInterviewer ? (
              <>
                <div className="mb-2 rounded-lg bg-ai/10 px-3 py-1.5 text-xs font-semibold text-ai">Your turn to interview {nameOf(partnerId)}. {spec.interviewPrompt}</div>
                <label className="lbl">Your notes about their {spec.subject}</label>
                <textarea className="field text-sm" rows={8} value={myWs.interview_notes || ""} onChange={(e) => { activeField.current = "notes"; patchMine({ interview_notes: e.target.value }); }} placeholder="What do they do, and what actually matters in it?" />
              </>
            ) : (
              <div className="rounded-xl bg-mist p-4 text-sm text-slate-600">
                Your partner is interviewing you about your {spec.subject}. Share openly. Here's what you wrote:
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-slate-700">{myWs.owner_job_description || "(nothing yet)"}</p>
              </div>
            )}
          </Panel>
        );
      })()}

      {/* REDESIGN (solo) — my redesign of my partner's subject */}
      {phase.key === "redesign" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-mist p-3 text-xs text-slate-500"><b className="text-ink">{nameOf(partnerId)}'s {spec.subject}:</b> {partnerWs?.owner_job_description || "(waiting)"}<br /><b className="text-ink">Your notes:</b> {myWs.interview_notes || "(none)"}</div>
          <Panel><div className="text-sm font-semibold text-ink">{spec.splitTitle || "The redesign"}</div><p className="mt-0.5 text-xs text-slate-400">{spec.splitIntro}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <BucketCol title="Lean into AI" buckets={aiBuckets} grid={grid} setBucket={setBucket} accent="text-ai" />
              <BucketCol title="Stay human" buckets={humanBuckets} grid={grid} setBucket={setBucket} accent="text-human" />
            </div>
          </Panel>
        </div>
      )}

      {/* REVEAL — the design my partner made for me, + my feedback */}
      {phase.key === "reveal" && (
        <div className="space-y-4">
          <Panel>
            <div className="text-sm font-semibold text-ink">What {nameOf(partnerId)} redesigned for you</div>
            {partnerWs ? <GridView buckets={spec.buckets} grid={partnerWs.grid || {}} /> : <p className="text-sm text-slate-400">Waiting for their design…</p>}
          </Panel>
          <Panel>
            <div className="text-sm font-semibold text-ink">Your feedback to them</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[["plus", "+ What works"], ["minus", "− To improve"], ["question", "? Questions"], ["idea", "! Ideas"]].map(([k, label]) => (
                <div key={k}><label className="lbl">{label}</label><textarea className="field text-sm" rows={2} value={(partnerWs?.feedback?.[k]) || ""} onChange={(e) => patchPartnerFeedback({ [k]: e.target.value })} disabled={!partnerWs} /></div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* FINAL — redo with the feedback I received */}
      {phase.key === "final" && (
        <div className="space-y-4">
          {myWs.feedback && Object.values(myWs.feedback).some(Boolean) && (
            <div className="rounded-xl bg-mist p-3 text-xs text-slate-600"><b className="text-ink">Feedback you received:</b> {Object.entries(myWs.feedback).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div>
          )}
          <Panel><div className="text-sm font-semibold text-ink">The keepable redesign</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <BucketCol title="Lean into AI" buckets={aiBuckets} grid={grid} setBucket={setBucket} accent="text-ai" />
              <BucketCol title="Stay human" buckets={humanBuckets} grid={grid} setBucket={setBucket} accent="text-human" />
            </div>
            <label className="lbl mt-3">In a sentence, their reimagined {spec.subject}</label>
            <textarea className="field text-sm" rows={2} value={myWs.final_description || ""} onChange={(e) => { activeField.current = "final"; patchMine({ final_description: e.target.value }); }} />
          </Panel>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => goToPhase(phaseIdx - 1)} disabled={phaseIdx === 0} className="btn-ghost">Back</button>
          <span className="text-xs text-slate-400">Either partner can advance the room</span>
          {phaseIdx < REDESIGN_PHASES.length - 1 ? <button onClick={() => goToPhase(phaseIdx + 1)} className="btn-primary">Next →</button> : <Link href={`/dashboard?done=${spec.slug || 1}`} className="btn-primary">Done</Link>}
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: any }) { return <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">{children}</div>; }

function BucketCol({ title, buckets, grid, setBucket, accent }: { title: string; buckets: any[]; grid: any; setBucket: (k: string, items: string[]) => void; accent: string }) {
  return (
    <div>
      <div className={`text-xs font-semibold uppercase tracking-wide ${accent}`}>{title}</div>
      <div className="mt-1 space-y-2">
        {buckets.map((b: any) => {
          const items: string[] = grid[b.key] || [];
          return (
            <div key={b.key} className="rounded-lg border border-line p-2">
              <div className="text-xs font-semibold text-ink">{b.label}</div>
              {b.hint && <div className="text-[10px] text-slate-400">{b.hint}</div>}
              <div className="mt-1 space-y-1">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input className="field flex-1 text-xs" value={it} onChange={(e) => setBucket(b.key, items.map((x, k) => (k === i ? e.target.value : x)))} />
                    <button onClick={() => setBucket(b.key, items.filter((_, k) => k !== i))} className="text-slate-300 hover:text-red-500">✕</button>
                  </div>
                ))}
                <button onClick={() => setBucket(b.key, [...items, ""])} className="text-[11px] font-semibold text-ai hover:underline">+ add</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridView({ buckets, grid }: { buckets: any[]; grid: any }) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {buckets.map((b: any) => {
        const items: string[] = grid[b.key] || [];
        if (!items.filter(Boolean).length) return null;
        return <div key={b.key} className="rounded-lg bg-mist p-2"><div className="text-xs font-semibold text-ink">{b.label}</div><ul className="mt-0.5 list-disc pl-4 text-xs text-slate-600">{items.filter(Boolean).map((it, i) => <li key={i}>{it}</li>)}</ul></div>;
      })}
    </div>
  );
}
