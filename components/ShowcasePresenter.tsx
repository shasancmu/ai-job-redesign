"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Item = { id: string; title: string; presenter?: string };

async function api(path: string, body: any) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

export default function ShowcasePresenter({ code, title, items, joinHost, qrSvg }: { code: string; title: string; items: Item[]; joinHost: string; qrSvg: string }) {
  const [current, setCurrent] = useState(-1);
  const [status, setStatus] = useState("open");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reportItems, setReportItems] = useState<string[]>([]);
  const [gen, setGen] = useState<string>("");

  const poll = useCallback(async () => {
    const { data } = await api("/api/showcase/state", { code });
    if (data && !data.error) {
      setCurrent(data.current); setStatus(data.status); setCounts(data.counts || {}); setReportItems(data.reportItems || []);
    }
  }, [code]);

  useEffect(() => { poll(); const id = setInterval(poll, 3000); return () => clearInterval(id); }, [poll]);

  async function go(i: number) { setCurrent(i); await api("/api/showcase/advance", { code, current: i }); poll(); }
  async function close() { if (!window.confirm("End the showcase? No more feedback will be accepted.")) return; setStatus("closed"); await api("/api/showcase/advance", { code, status: "closed" }); }
  async function report(itemId: string) {
    setGen(itemId);
    const { ok, data } = await api("/api/showcase/report", { code, itemId });
    setGen("");
    if (ok) poll(); else window.alert(data.error || "Couldn't build the report.");
  }

  const item = current >= 0 ? items[current] : null;

  const joinPill = (
    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2 shadow-soft">
      {qrSvg ? <div className="h-16 w-16 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : null}
      <div className="leading-tight">
        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{joinHost}</div>
        <div className="font-mono text-xl font-bold tracking-widest text-ink">{code}</div>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Showcase</div>
          <h1 className="text-2xl font-bold text-ink">{title || "Presentations"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {joinPill}
          {status !== "closed" && <button onClick={close} className="btn-ghost text-sm">End</button>}
        </div>
      </header>

      {/* Current */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6 text-center">
        {item ? (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Now presenting · {current + 1} of {items.length}</div>
            <h2 className="mt-1 text-3xl font-bold leading-tight text-ink">{item.title}</h2>
            {item.presenter && <div className="mt-1 text-slate-500">{item.presenter}</div>}
            <div className="mt-3 text-sm text-slate-500">{counts[item.id] || 0} piece{(counts[item.id] || 0) === 1 ? "" : "s"} of feedback in</div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-ink">Ready when you are</h2>
            <p className="mt-1 text-sm text-slate-500">Scan to join. Start the first presentation to open feedback.</p>
          </>
        )}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => go(current - 1)} disabled={current <= -1 || status === "closed"} className="btn-ghost text-sm disabled:opacity-40">← Prev</button>
          {current < 0 ? (
            <button onClick={() => go(0)} disabled={status === "closed"} className="btn-primary">Start ({items.length}) →</button>
          ) : current < items.length - 1 ? (
            <button onClick={() => go(current + 1)} disabled={status === "closed"} className="btn-primary">Next presenter →</button>
          ) : (
            <span className="text-sm text-slate-400">Last presenter</span>
          )}
        </div>
      </div>

      {/* Line-up + reports */}
      <div className="mt-6 card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The line-up · feedback and reports</div>
        <div className="mt-3 space-y-2">
          {items.map((it, i) => {
            const has = reportItems.includes(it.id);
            return (
              <div key={it.id} className={"flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 " + (i === current ? "border-ink bg-ink/5" : "border-line")}>
                <button onClick={() => go(i)} className="flex items-center gap-2 text-left" title="Jump to this presenter">
                  <span className="w-5 shrink-0 text-right text-sm text-slate-400">{i + 1}</span>
                  <span>
                    <span className="text-sm font-semibold text-ink">{it.title}</span>
                    {it.presenter && <span className="ml-2 text-xs text-slate-400">{it.presenter}</span>}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{counts[it.id] || 0} feedback</span>
                  {has ? (
                    <Link href={`/showcase/${code}/report/${it.id}`} target="_blank" className="btn-ghost text-xs">Report →</Link>
                  ) : (
                    <button onClick={() => report(it.id)} disabled={gen === it.id || !(counts[it.id] > 0)} className="btn-primary text-xs disabled:opacity-40" title={counts[it.id] > 0 ? "" : "No feedback yet"}>{gen === it.id ? "..." : "Generate report"}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">Each report has a shareable link you can send to that presenter.</p>
      </div>
    </main>
  );
}
