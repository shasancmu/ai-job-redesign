"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import EmpathyAggregate from "@/components/EmpathyAggregate";
import ShareReport from "@/components/ShareReport";

type Interview = { id: string; respondent: string; transcript: any[]; profile: any; created_at: string };

// Owner-side room for Understand Your Customer: set up the study, share one link,
// watch empathy profiles arrive, and synthesize across them.
export default function EmpathyRoom({ session, token, initialWorkspace }: { session: any; token: string; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && !!(navigator as any).share);
  }, []);
  const link = origin ? `${origin}/empathy/${token}` : "";

  const study = (state.offer || state.business || "").trim();
  const inviteSubject = study ? `A quick 5-minute chat about ${study}` : "A quick 5-minute chat, I'd love your take";
  const inviteBody = `Hi,\n\nI'm trying to understand what people really need${study ? ` around ${study}` : ""}, and your perspective would mean a lot. It's a short, casual chat (about 5 minutes) with no wrong answers, nothing is being sold.\n\nHere's the link:\n${link}\n\nThank you!`;
  const mailto = `mailto:?subject=${encodeURIComponent(inviteSubject)}&body=${encodeURIComponent(inviteBody)}`;
  async function share() {
    try { await (navigator as any).share({ title: inviteSubject, text: inviteBody, url: link }); } catch {}
  }

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [synth, setSynth] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Autosave the owner's setup (business / offer / audience / goals).
  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const setCanvas = (patch: Record<string, any>) => {
    const canvas = { ...state, ...patch };
    setWs((w: any) => ({ ...w, canvas }));
    pending.current = { canvas };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };

  const loadInterviews = useCallback(async () => {
    const { data } = await supabase
      .from("empathy_interviews")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false });
    setInterviews((data as any) || []);
    setLoading(false);
  }, [supabase, session.id]);
  useEffect(() => { loadInterviews(); }, [loadInterviews]);

  // All of this owner's empathy studies, so they can switch between products/ideas.
  const [studies, setStudies] = useState<{ code: string; label: string }[]>([]);
  const loadStudies = useCallback(async () => {
    const { data: sess } = await supabase.from("sessions").select("id, code, created_at").eq("exercise", "empathy").order("created_at", { ascending: false });
    if (!sess || sess.length === 0) return;
    const ids = sess.map((s: any) => s.id);
    const { data: wss } = await supabase.from("workspaces").select("session_id, canvas").in("session_id", ids);
    const labelBy = new Map((wss || []).map((w: any) => [w.session_id, ((w.canvas?.offer || w.canvas?.business || "") as string).trim()]));
    setStudies(sess.map((s: any) => ({ code: s.code, label: labelBy.get(s.id) || "Untitled study" })));
  }, [supabase]);
  useEffect(() => { loadStudies(); }, [loadStudies]);

  async function synthesize() {
    setSynth(true); setErr(null);
    try {
      const res = await fetch("/api/empathy/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: session.code }) });
      const d = await res.json();
      if (res.ok && d.aggregate) setWs((w: any) => ({ ...w, canvas: { ...(w.canvas || {}), aggregate: d.aggregate, aggregateN: d.n } }));
      else setErr(d.error || "Couldn't synthesize.");
    } catch { setErr("Couldn't synthesize."); }
    setSynth(false);
  }

  const withProfile = interviews.filter((i) => i.profile);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Understand Your Customer</span>
          {study && <span className="text-sm text-slate-400">· {study}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/start/customer-empathy" className="btn-ghost text-sm" title="Run a separate study for another product or idea">+ New study</Link>
          <button onClick={loadInterviews} className="btn-ghost text-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Study switcher — one study per product/idea */}
      {studies.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your studies</span>
          {studies.map((s) => (
            <Link
              key={s.code}
              href={`/room/${s.code}`}
              className={"max-w-[220px] truncate rounded-full px-3 py-1 text-sm " + (s.code === session.code ? "bg-ink text-white" : "bg-mist text-slate2 hover:text-ink")}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}

      {/* Setup */}
      <div className="card space-y-4 p-5">
        <div>
          <div className="text-sm font-bold text-ink">What are you exploring?</div>
          <p className="text-xs text-slate-400">One study = one product or idea. Use <b>+ New study</b> above to start a separate link for a different one.</p>
        </div>
        <div>
          <label className="lbl">The product or idea you want to understand</label>
          <input className="field" placeholder="e.g. a weekly sourdough subscription" value={state.offer || ""} onChange={(e) => setCanvas({ offer: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="lbl">Your business (optional context)</label>
            <input className="field" placeholder="e.g. Maple & Oak, a neighborhood bakery" value={state.business || ""} onChange={(e) => setCanvas({ business: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Who is this customer?</label>
            <input className="field" placeholder="e.g. busy parents who buy bread every week" value={state.audience || ""} onChange={(e) => setCanvas({ audience: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="lbl">What do you most want to learn?</label>
          <textarea className="field min-h-[70px]" placeholder="e.g. why they choose one bakery over another, what would make them subscribe, what frustrates them today" value={state.goals || ""} onChange={(e) => setCanvas({ goals: e.target.value })} />
        </div>
      </div>

      {/* Share link */}
      <div className="card mt-4 p-5">
        <div className="text-sm font-bold text-ink">Send this link to potential customers</div>
        <p className="mt-1 text-xs text-slate-400">Anyone with the link can do the interview, no account needed. Send it to as many people as you like; each conversation comes back here.</p>
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={link} className="field flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-ghost shrink-0 text-sm">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a href={mailto} className="btn-primary text-sm">✉️ Email the link</a>
          {canShare && <button onClick={share} className="btn-ghost text-sm">↗ Share…</button>}
        </div>
        <p className="mt-2 text-xs text-slate-400">Email opens your own mail app with a friendly note already written, so the invite comes from you.</p>
      </div>

      {/* Aggregate */}
      {withProfile.length >= 1 && (
        <div className="mt-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm font-semibold text-ink">{withProfile.length} interview{withProfile.length === 1 ? "" : "s"} in. See the pattern across them.</div>
            <button onClick={synthesize} disabled={synth} className="btn-primary text-sm">{synth ? "Synthesizing…" : state.aggregate ? "↻ Re-synthesize" : "✨ Synthesize across all"}</button>
          </div>
          {err && <p className="mt-2 text-sm text-clay">{err}</p>}
          {state.aggregate && (
            <>
              <div className="mt-3 flex justify-end">
                <ShareReport code={session.code} title="Customer research findings" text="Here's what I learned from customer interviews on Superadditive:" />
              </div>
              <EmpathyAggregate a={state.aggregate} />
            </>
          )}
        </div>
      )}

      {/* Interviews */}
      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Interviews</div>
        {loading ? (
          <div className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">Loading…</div>
        ) : interviews.length === 0 ? (
          <div className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">
            No interviews yet. Share the link above, then tap <b>Refresh</b> to check for responses.
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((iv) => (
              <div key={iv.id} className="card overflow-hidden">
                <button onClick={() => setOpenId(openId === iv.id ? null : iv.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                  <div>
                    <div className="text-sm font-semibold text-ink">{iv.respondent || "Anonymous customer"}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{iv.profile?.snapshot || iv.profile?.jobToBeDone || `${(iv.transcript || []).filter((m: any) => m.role === "user").length} answers`}</div>
                  </div>
                  <span className="shrink-0 text-slate-400">{openId === iv.id ? "▲" : "▼"}</span>
                </button>
                {openId === iv.id && (
                  <div className="border-t border-line px-5 py-4">
                    {iv.profile ? <Profile p={iv.profile} /> : <p className="text-sm text-slate2">The write-up didn&apos;t generate. The raw conversation is below.</p>}
                    <Transcript t={iv.transcript || []} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Chips({ items, tone }: { items?: string[]; tone: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((x, i) => <span key={i} className={"rounded-full px-2.5 py-1 text-xs " + tone}>{x}</span>)}
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function Profile({ p }: { p: any }) {
  const em = p.empathyMap || {};
  return (
    <div className="space-y-4">
      {p.snapshot && <p className="text-sm leading-relaxed text-slate2">{p.snapshot}</p>}
      {p.jobToBeDone && (
        <div className="rounded-xl bg-mist p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Job to be done</div>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink">{p.jobToBeDone}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Says"><Chips items={em.says} tone="bg-sky-soft text-sky" /></Field>
        <Field label="Thinks"><Chips items={em.thinks} tone="bg-sky-soft text-sky" /></Field>
        <Field label="Does"><Chips items={em.does} tone="bg-sage-soft text-sage" /></Field>
        <Field label="Feels"><Chips items={em.feels} tone="bg-amber-soft text-amber" /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pains"><Chips items={p.pains} tone="bg-clay-soft text-clay" /></Field>
        <Field label="Gains"><Chips items={p.gains} tone="bg-sage-soft text-sage" /></Field>
      </div>
      {p.surprise && (
        <Field label="Surprise"><p className="mt-1 text-sm leading-relaxed text-slate2">{p.surprise}</p></Field>
      )}
      {Array.isArray(p.quotes) && p.quotes.length > 0 && (
        <div className="space-y-1.5">
          {p.quotes.map((q: string, i: number) => <p key={i} className="border-l-2 border-line pl-3 text-sm italic text-slate2">&ldquo;{q}&rdquo;</p>)}
        </div>
      )}
      {Array.isArray(p.howToServe) && p.howToServe.length > 0 && (
        <Field label="How to win them">
          <ul className="mt-1 space-y-1">
            {p.howToServe.map((x: string, i: number) => <li key={i} className="flex gap-2 text-sm text-slate2"><span className="text-slate-300">→</span><span>{x}</span></li>)}
          </ul>
        </Field>
      )}
    </div>
  );
}

function Transcript({ t }: { t: any[] }) {
  const [open, setOpen] = useState(false);
  if (!t || t.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-3">
      <button onClick={() => setOpen(!open)} className="text-xs font-medium text-slate-400 hover:text-ink">{open ? "Hide" : "Read"} the full conversation</button>
      {open && (
        <div className="mt-3 space-y-2">
          {t.map((m, i) => (
            <div key={i} className="text-sm">
              <span className={m.role === "user" ? "font-semibold text-ink" : "font-semibold text-slate-400"}>{m.role === "user" ? "Customer" : "Interviewer"}: </span>
              <span className="text-slate2">{m.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
