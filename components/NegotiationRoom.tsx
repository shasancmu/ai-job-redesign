"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Timer from "@/components/Timer";
import { scenarioByExercise, analyze, yourMaxOf, type Scenario, type MultiScenario, type PriceScenario } from "@/lib/negotiation";
import RoleplayChat, { type Msg } from "@/components/RoleplayChat";
import { streamPost } from "@/lib/streamClient";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";
import StepHeader from "./StepHeader";

// Streams the counterpart's reply token by token. Errors propagate so the chat
// can show a retry message rather than a silent dead end.
async function negotiationReply(exercise: string, history: Msg[], onChunk?: (d: string) => void): Promise<string | null> {
  return streamPost("/api/negotiation/reply", { exercise, messages: history }, onChunk || (() => {}));
}

// Translate with a fallback to the passed-in English: if the key is missing,
// show the original rather than a raw key.
function tf(t: T, key: string, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

const TAG_META: Record<string, { label: string; color: string }> = {
  compatible: { label: "Compatible", color: "#3F7A52" },
  distributive: { label: "Distributive", color: "#B4532E" },
  integrative: { label: "Trade / logroll", color: "#CE8F2C" },
};

export default function NegotiationRoom({ me, session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const t = useT();
  const scn = scenarioByExercise(session.exercise) as Scenario;
  const STEPS = [
    { key: "brief", title: tf(t, "steps.nego.brief.title", "Your brief"), minutes: 5 },
    { key: "negotiate", title: tf(t, "steps.nego.negotiate.title", "Negotiate with {name}").split("{name}").join(scn.counterpartName), minutes: 20 },
    { key: "deal", title: tf(t, "steps.nego.deal.title", "Lock the deal"), minutes: 3 },
    { key: "debrief", title: tf(t, "steps.nego.debrief.title", "Debrief"), minutes: 6 },
  ];

  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = STEPS[phase] ?? STEPS[0];

  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const update = useCallback((patch: Record<string, any>) => {
    setWs((w: any) => ({ ...w, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);
  const setState = (patch: Record<string, any>) => update({ canvas: { ...state, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    const status = clamped >= STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{scn.name} · {t("nego.negotiationTag")}</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())}
          onAdvance={phase < STEPS.length - 1 ? () => go(phase + 1) : undefined} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <StepHeader n={phase + 1} total={STEPS.length} minutes={step.minutes} title={step.title} />

      <div className="pb-24">
        {step.key === "brief" && <Brief scn={scn} />}
        {step.key === "negotiate" && (
          <RoleplayChat
            chat={state.chat || []}
            setChat={(c) => setState({ chat: c })}
            onCall={(h, onChunk) => negotiationReply(scn.exercise, h, onChunk)}
            counterpartName={scn.counterpartName}
            aiOpens
            placeholder={t("nego.replyTo", { name: scn.counterpartName })}
          />
        )}
        {step.key === "deal" && <Deal scn={scn} terms={state.terms || {}} noDeal={!!state.noDeal} onTerms={(t) => setState({ terms: t })} onNoDeal={(v) => setState({ noDeal: v })} />}
        {step.key === "debrief" && <Debrief scn={scn} state={state} setState={setState} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">{step.key === "deal" ? t("nego.seeScore") : t("room.next")} →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">{t("room.finish")}</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Brief({ scn }: { scn: Scenario }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-slate-700">{scn.scenario}</div>
      {scn.kind === "multi-issue" ? (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("nego.privatePriorities")}</div>
          <p className="mt-1 text-sm text-slate-500">{t("nego.priorityIntro1")} <b>{yourMaxOf(scn)}</b>{t("nego.priorityIntro2")} <b>{scn.yourBatna}</b>{t("nego.priorityIntro3")}</p>
          <div className="mt-4 space-y-4">
            {scn.issues.map((iss) => (
              <div key={iss.key}>
                <div className="text-sm font-semibold text-ink">{iss.label}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {iss.options.map((o) => (
                    <span key={o.label} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-slate-600">{o.label} <span className="font-semibold text-sage">+{o.you}</span></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">{t("nego.otherSidePriorities")}</p>
        </div>
      ) : (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("nego.yourPosition")}</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li>• {t("nego.posListed1", { name: scn.counterpartName, item: scn.item })} <b>${scn.listPrice.toLocaleString()}</b>.</li>
            <li>• {t("nego.posWalkA")} <b>{t("nego.posWalkB")} ${scn.yourReservation.toLocaleString()}</b> {t("nego.posWalkC")}</li>
            <li>• {t("nego.posEveryDollar", { amount: scn.yourReservation.toLocaleString() })}</li>
            <li>• {t("nego.posFloor")}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Deal({ scn, terms, noDeal, onTerms, onNoDeal }: { scn: Scenario; terms: Record<string, number>; noDeal: boolean; onTerms: (t: Record<string, number>) => void; onNoDeal: (v: boolean) => void }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="card p-5">
        {scn.kind === "multi-issue" ? (
          <>
            <div className="text-sm text-slate-500">{t("nego.recordDeal")}</div>
            <div className="mt-4 space-y-3">
              {scn.issues.map((iss) => (
                <div key={iss.key} className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-ink">{iss.label}</label>
                  <select className="field" style={{ maxWidth: 220 }} value={terms[iss.key] ?? ""} disabled={noDeal} onChange={(e) => onTerms({ ...terms, [iss.key]: Number(e.target.value) })}>
                    <option value="">{t("nego.choose")}</option>
                    {iss.options.map((o, i) => (<option key={o.label} value={i}>{o.label}</option>))}
                  </select>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-slate-500">{t("nego.whatPrice", { item: scn.item })}</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-lg text-slate-500">$</span>
              <input type="number" className="field" style={{ maxWidth: 200 }} placeholder="14000" disabled={noDeal} value={terms.price ?? ""} onChange={(e) => onTerms({ price: Number(e.target.value) })} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{t("nego.reminderOver", { amount: scn.yourReservation.toLocaleString() })}</p>
          </>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={noDeal} onChange={(e) => onNoDeal(e.target.checked)} />
        {scn.kind === "multi-issue" ? t("nego.noDealMulti") : t("nego.noDealPrice")}
      </label>
    </div>
  );
}

function Debrief({ scn, state, setState }: { scn: Scenario; state: any; setState: (p: Record<string, any>) => void }) {
  const t = useT();
  const a = analyze(scn, state.terms || {}, !!state.noDeal);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const [coachErr, setCoachErr] = useState("");
  const feedback = state.feedback;

  async function coach() {
    setBusy(true); setLive(""); setCoachErr("");
    try {
      const transcript = (state.chat || []).map((m: Msg) => `${m.role === "user" ? "You" : scn.counterpartName}: ${m.content}`).join("\n");
      const full = await streamPost(
        "/api/negotiation/debrief",
        { exercise: scn.exercise, terms: state.terms || {}, noDeal: !!state.noDeal, transcript },
        (d) => setLive((s) => s + d)
      );
      if (full) setState({ feedback: full });
      setLive("");
    } catch (e: any) {
      setCoachErr(e?.message || "Couldn't build the debrief. Please try again.");
    } finally { setBusy(false); }
  }

  const effColor = a.efficiency >= 85 ? "#3F7A52" : a.efficiency >= 65 ? "#CE8F2C" : "#B4532E";

  return (
    <div className="space-y-4">
      {a.noDeal ? (
        <div className="card p-5 text-slate-700">{t("nego.noDealWalked")}</div>
      ) : scn.kind === "multi-issue" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t("nego.yourScore")} value={`${a.you}`} sub={t("nego.scoreSub", { max: yourMaxOf(scn), batna: scn.yourBatna })} color={a.beatBATNA ? "#3F7A52" : "#B4532E"} />
            <Stat label={t("nego.theirScore", { name: scn.counterpartName })} value={`${a.them}`} />
            <Stat label={t("nego.jointValue")} value={`${a.efficiency}%`} sub={t("nego.jointSub", { joint: a.joint, max: a.maxJoint })} color={effColor} />
          </div>
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("nego.issueByIssue")}</div>
            <div className="mt-3 space-y-2">
              {a.issues!.map((it) => {
                const tg = TAG_META[it.tag];
                return (
                  <div key={it.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{it.label}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: tg.color }}>{tf(t, "nego.tag_" + it.tag, tg.label)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <span>{it.chosen}</span>
                      <span className="text-xs">{t("nego.you")} <b className="text-sage">+{it.you}</b> · {t("nego.them")} +{it.them}</span>
                      {it.atOptimal ? <span className="text-xs font-semibold text-sage">✓ {t("nego.jointBest")}</span> : <span className="text-xs text-slate-400" title={t("nego.jointBestTitle", { optimal: it.optimal })}>↑ {it.optimal}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-400">{t("nego.legend")}</p>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t("nego.agreedPrice")} value={`$${(a.agreedPrice || 0).toLocaleString()}`} color={a.beatBATNA ? "#14283A" : "#B4532E"} />
            <Stat label={t("nego.youSaved")} value={`$${a.you.toLocaleString()}`} sub={t("nego.savedSub", { amount: (scn as PriceScenario).yourReservation.toLocaleString() })} color="#3F7A52" />
            <Stat label={t("nego.yourShare")} value={`${a.efficiency ? Math.round((a.you / a.maxJoint) * 100) : 0}%`} sub={t("nego.shareSub", { amount: (scn as PriceScenario).theirReservation.toLocaleString() })} color={effColor} />
          </div>
          <ZopaBar scn={scn as PriceScenario} price={a.agreedPrice || 0} />
        </>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">{t("nego.coachDebrief")}</div>
          {!feedback && !live && <button onClick={coach} disabled={busy} className="btn-primary text-sm">{busy ? t("room.thinking") : "✨ " + t("nego.getFeedback")}</button>}
        </div>
        {(feedback || live) && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-700">{feedback || live}</p>}
        {coachErr && <p className="mt-2 text-sm text-red-700">{coachErr}</p>}
      </div>
    </div>
  );
}

function ZopaBar({ scn, price }: { scn: PriceScenario; price: number }) {
  const t = useT();
  const lo = scn.theirReservation, hi = scn.yourReservation;
  const pct = Math.max(0, Math.min(100, ((price - lo) / (hi - lo)) * 100));
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("nego.zopaTitle")}</div>
      <div className="relative mt-6 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#3F7A52,#CE8F2C,#B4532E)" }}>
        <div className="absolute -top-6 -translate-x-1/2 text-xs font-semibold text-ink" style={{ left: `${pct}%` }}>${price.toLocaleString()}</div>
        <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink" style={{ left: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>${lo.toLocaleString()} {t("nego.sellersFloor")}</span>
        <span>${hi.toLocaleString()} {t("nego.yourCeiling")}</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{t("nego.zopaHint")}</p>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const t = useT();
  return (
    <div className="rounded-xl bg-mist p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-2xl font-bold" style={{ color: color || "#14283A" }}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
