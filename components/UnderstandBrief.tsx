"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Brief = { who?: string; blocker?: string; unlock?: string; needs?: string[]; one_thing?: string };
type Rec = { slug: string; name: string; emoji: string };

// Loads the stored understanding for one person; generated once, then only
// rebuilt when the instructor asks (↻). A read of the person — their conceptual
// block and the unlock — not a re-rolled summary on every view.
export default function UnderstandBrief({ userId }: { userId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [rec, setRec] = useState<Rec[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load(force: boolean) {
    if (force) setBusy(true);
    setErr("");
    try {
      const d = await fetch("/api/team/person/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, force }) }).then((r) => r.json());
      if (d?.brief) { setBrief(d.brief); setRec(d.recommended || []); setCachedAt(d.cachedAt || null); }
      else setErr(d?.error || "Couldn't build a reading.");
    } catch { setErr("Couldn't build a reading."); }
    setBusy(false);
  }

  useEffect(() => { let live = true; (async () => { if (live) await load(false); })(); return () => { live = false; }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const when = (() => { try { return cachedAt ? new Date(cachedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""; } catch { return ""; } })();

  if (err) return <div className="rounded-2xl border border-line bg-white p-5 text-sm text-slate-400">{err}</div>;

  if (!brief) {
    return (
      <div className="animate-pulse rounded-2xl border border-line bg-white p-5">
        <div className="h-4 w-4/5 rounded bg-mist" />
        <div className="mt-3 h-3 w-24 rounded bg-mist" />
        <div className="mt-2 h-4 w-full rounded bg-mist" />
        <div className="mt-1.5 h-4 w-2/3 rounded bg-mist" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      {brief.who && <p className="text-[15px] leading-relaxed text-ink">{brief.who}</p>}

      {brief.blocker && (
        <div className="mt-4">
          <div className="eyebrow text-slate-400">The block</div>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">{brief.blocker}</p>
        </div>
      )}
      {brief.unlock && (
        <div className="mt-4">
          <div className="eyebrow text-sage">The unlock</div>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">{brief.unlock}</p>
        </div>
      )}

      {brief.needs && brief.needs.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow text-slate-400">What would help</div>
          <ul className="mt-1.5 space-y-1">
            {brief.needs.map((n, i) => <li key={i} className="flex gap-2 text-sm text-slate2"><span className="text-sage">·</span><span>{n}</span></li>)}
          </ul>
        </div>
      )}

      {brief.one_thing && (
        <div className="mt-4 rounded-xl border border-sage/30 bg-sage-soft/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Do this next</div>
          <p className="mt-1 text-sm leading-relaxed text-ink">{brief.one_thing}</p>
        </div>
      )}

      {rec.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow text-slate-400">Might fit them next</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {rec.map((r) => <Link key={r.slug} href={`/start/${r.slug}`} className="rounded-full border border-line bg-mist/40 px-3 py-1 text-sm text-slate2 transition hover:border-slate-300 hover:text-ink">{r.emoji} {r.name}</Link>)}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
        {when && <span>read {when}</span>}
        <button onClick={() => load(true)} disabled={busy} className="font-medium text-sky hover:underline disabled:text-slate-300">{busy ? "reading again…" : "↻ regenerate"}</button>
      </div>
    </div>
  );
}
