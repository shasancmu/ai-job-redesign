"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { aggregate } from "@/lib/cloud";
import WordCloud from "@/components/WordCloud";

// The facilitator's live screen. Polls its own live_entries (host reads under
// RLS) every 2.5s, aggregates by kind, and can ask the AI to read the room.
export default function LivePresenter({ sessionId, code, spec, origin }: { sessionId: string; code: string; spec: any; origin: string }) {
  const supabase = createClient();
  const [entries, setEntries] = useState<any[]>([]);
  const [synth, setSynth] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    const load = async () => { const { data } = await supabase.from("live_entries").select("text, choice, norm").eq("session_id", sessionId).limit(1000); if (live && data) setEntries(data); };
    load();
    const t = setInterval(load, 2500);
    return () => { live = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const words = useMemo(() => (spec.kind === "wordcloud" ? aggregate(entries.filter((e) => e.text).map((e) => ({ text: e.text, norm: e.norm || "" }))) : []), [entries, spec.kind]);
  const pollCounts = useMemo(() => {
    if (spec.kind !== "poll") return [];
    const counts: Record<string, number> = {}; for (const o of spec.options || []) counts[o] = 0;
    for (const e of entries) if (e.choice && counts[e.choice] != null) counts[e.choice]++;
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return (spec.options || []).map((o: string) => ({ option: o, n: counts[o], pct: Math.round((counts[o] / total) * 100) }));
  }, [entries, spec]);

  async function synthesize() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/live/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.synthesis) throw new Error(d.error || "Couldn't synthesize.");
      setSynth(d.synthesis);
    } catch (e: any) { setErr(e?.message || "Couldn't synthesize."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Join at {origin.replace(/^https?:\/\//, "")}/live</div>
          <div className="font-mono text-3xl font-bold tracking-widest text-ink">{code}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-ink">{entries.length}</div>
          <div className="text-[11px] text-slate-500">responses</div>
        </div>
      </div>

      <h1 className="mb-4 font-serif text-2xl text-ink">{spec.emoji} {spec.prompt}</h1>

      {spec.kind === "wordcloud" && (
        <div className="h-[52vh] rounded-2xl border border-line bg-white p-4"><WordCloud words={words} /></div>
      )}
      {spec.kind === "poll" && (
        <div className="space-y-2">
          {pollCounts.map((r: any) => (
            <div key={r.option} className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-center justify-between text-sm"><span className="font-medium text-ink">{r.option}</span><span className="tabular-nums text-slate-500">{r.n} · {r.pct}%</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-ai" style={{ width: `${r.pct}%` }} /></div>
            </div>
          ))}
        </div>
      )}
      {spec.kind === "responses" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {entries.filter((e) => e.text).slice().reverse().map((e, i) => <div key={i} className="rounded-xl border border-line bg-white p-3 text-sm text-slate-700">{e.text}</div>)}
          {entries.length === 0 && <div className="text-sm text-slate-400">Responses will appear here.</div>}
        </div>
      )}

      {(spec.kind === "responses" || spec.kind === "wordcloud") && spec.synthesize !== false && (
        <div className="mt-5">
          <button onClick={synthesize} disabled={busy || entries.length === 0} className="btn-primary text-sm disabled:opacity-50">{busy ? "Reading the room…" : "✨ Synthesize with AI"}</button>
          {err && <span className="ml-2 text-sm text-red-700">{err}</span>}
          {synth && (
            <div className="mt-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
              {(synth.themes || []).map((t: any, i: number) => <div key={i} className="mb-2"><span className="font-semibold text-ink">{t.title}.</span> <span className="text-slate-600">{t.gist}</span></div>)}
              {synth.tension && <p className="mt-2 text-sm text-slate-600"><b>The range:</b> {synth.tension}</p>}
              {synth.question && <p className="mt-2 text-sm text-ink"><b>Put back to the room:</b> {synth.question}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
