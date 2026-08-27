"use client";

import { useState } from "react";
import Link from "next/link";
import RoleplayChat, { type Msg } from "@/components/RoleplayChat";
import { streamPost } from "@/lib/streamClient";

// Self-contained runner for an authored negotiation (the client-safe scenario:
// the counterpart's payoffs are stripped). Chat drives the AI counterpart; the
// deal panel sets terms; locking scores it server-side with the real analyze().
export default function NegRunner({ scn }: { scn: any }) {
  const multi = scn.kind === "multi-issue";
  const [chat, setChat] = useState<Msg[]>([]);
  const [terms, setTerms] = useState<Record<string, number>>({});
  const [price, setPrice] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  async function onCall(history: Msg[], onChunk?: (d: string) => void) {
    return streamPost("/api/mechanics/negotiation/reply", { slug: scn.slug, messages: history }, onChunk || (() => {}));
  }

  async function lock(noDeal: boolean) {
    setBusy(true); setErr("");
    try {
      const body = { slug: scn.slug, noDeal, terms: multi ? terms : { price: Number(price) || 0 } };
      const res = await fetch("/api/mechanics/negotiation/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.analysis) throw new Error(d.error || "Couldn't score the deal.");
      setResult(d);
    } catch (e: any) { setErr(e?.message || "Couldn't score the deal."); }
    finally { setBusy(false); }
  }

  if (result) {
    const a = result.analysis; const db = result.debrief;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your result</div>
          {a.noDeal ? <div className="mt-2 text-lg font-bold text-clay">No deal — you walked away.</div> : (
            <>
              <div className="mt-2 flex flex-wrap gap-4">
                <Metric label={multi ? "Your score" : "You saved"} v={a.you} />
                <Metric label="Joint efficiency" v={`${a.efficiency}%`} />
                <Metric label="Beat your walk-away" v={a.beatBATNA ? "yes" : "no"} good={a.beatBATNA} />
                {!multi && <Metric label="Agreed price" v={`${scn.unit}${(a.agreedPrice || 0).toLocaleString()}`} />}
              </div>
              {multi && a.issues?.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Issue by issue (the reveal)</div>
                  <div className="mt-2 space-y-1 text-sm">
                    {a.issues.map((i: any) => (
                      <div key={i.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-1">
                        <span className="text-slate-600">{i.label} <span className="ml-1 rounded-full bg-mist px-1.5 py-0.5 text-[10px] text-slate-500">{i.tag}</span></span>
                        <span className="text-slate-700">chose <b>{i.chosen}</b>{i.atOptimal ? <span className="text-sage"> ✓ best joint</span> : <span className="text-clay"> · best joint was {i.optimal}</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {db && (
            <div className="mt-4 rounded-xl bg-mist p-3 text-sm">
              <div className="font-semibold text-ink">{db.headline}</div>
              {db.whatWorked && <p className="mt-1 text-slate-600"><b>What worked:</b> {db.whatWorked}</p>}
              {db.biggestMiss && <p className="mt-1 text-slate-600"><b>Biggest miss:</b> {db.biggestMiss}</p>}
              {db.principle && <p className="mt-1 text-ink"><b>Principle:</b> {db.principle}</p>}
            </div>
          )}
          <div className="mt-4"><Link href="/studio/negotiation" className="btn-ghost text-sm">Done</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <div className="mb-3 rounded-2xl border border-line bg-mist p-4 text-sm leading-relaxed text-slate-700">{scn.scenario}</div>
        <RoleplayChat chat={chat} setChat={setChat} onCall={onCall} counterpartName={scn.counterpartName} aiOpens placeholder={`Negotiate with ${scn.counterpartName}...`} />
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-ink">Your deal</div>
          <p className="mt-0.5 text-[11px] text-slate-400">The numbers are YOUR points. Higher is better for you. Lock when you've agreed.</p>
          {multi ? (
            <div className="mt-3 space-y-3">
              {scn.issues.map((iss: any) => (
                <div key={iss.key}>
                  <div className="text-xs font-semibold text-slate-600">{iss.label}</div>
                  <div className="mt-1 space-y-1">
                    {iss.options.map((o: any, oi: number) => (
                      <label key={oi} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-line px-2 py-1 text-xs hover:bg-mist">
                        <span className="flex items-center gap-2"><input type="radio" name={iss.key} checked={terms[iss.key] === oi} onChange={() => setTerms((t) => ({ ...t, [iss.key]: oi }))} /> {o.label}</span>
                        <span className="tabular-nums text-slate-400">+{o.you}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-xs text-slate-500">List: {scn.unit}{scn.listPrice?.toLocaleString()} · Your walk-away: {scn.unit}{scn.yourReservation?.toLocaleString()}</div>
              <input className="field mt-2 text-sm" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} placeholder={`Agreed price (${scn.unit})`} />
            </div>
          )}
          <button onClick={() => lock(false)} disabled={busy} className="btn-primary mt-3 w-full text-sm">{busy ? "Scoring..." : "Lock the deal"}</button>
          <button onClick={() => lock(true)} disabled={busy} className="btn-ghost mt-1 w-full text-sm">Walk away (no deal)</button>
          {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, v, good }: { label: string; v: any; good?: boolean }) {
  return <div><div className={`text-xl font-bold ${good === true ? "text-sage" : good === false ? "text-clay" : "text-ink"}`}>{v}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}
