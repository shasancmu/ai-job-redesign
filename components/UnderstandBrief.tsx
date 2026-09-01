"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Brief = { who?: string; here_for?: string; where?: string; needs?: string[]; one_thing?: string };
type Rec = { slug: string; name: string; emoji: string };

// Loads the understanding brief for one person on mount — the page shows the
// facts instantly and this fills in the "who they are / what they need" reading.
export default function UnderstandBrief({ userId }: { userId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [rec, setRec] = useState<Rec[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/team/person/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) })
      .then((r) => r.json())
      .then((d) => { if (!live) return; if (d?.brief) { setBrief(d.brief); setRec(d.recommended || []); } else setErr(d?.error || "Couldn't build a reading."); })
      .catch(() => { if (live) setErr("Couldn't build a reading."); });
    return () => { live = false; };
  }, [userId]);

  if (err) return <div className="rounded-2xl border border-line bg-white p-5 text-sm text-slate-400">{err}</div>;

  if (!brief) {
    return (
      <div className="animate-pulse rounded-2xl border border-line bg-white p-5">
        <div className="h-3 w-24 rounded bg-mist" />
        <div className="mt-3 h-4 w-full rounded bg-mist" />
        <div className="mt-2 h-4 w-4/5 rounded bg-mist" />
        <div className="mt-4 h-3 w-32 rounded bg-mist" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      {brief.who && <p className="text-[15px] leading-relaxed text-ink">{brief.who}</p>}
      {brief.here_for && <p className="mt-2 text-[15px] leading-relaxed text-slate2"><span className="font-semibold text-ink">Here for:</span> {brief.here_for}</p>}
      {brief.where && <p className="mt-2 text-[15px] leading-relaxed text-slate2"><span className="font-semibold text-ink">Right now:</span> {brief.where}</p>}

      {brief.needs && brief.needs.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow text-slate-400">What would help them</div>
          <ul className="mt-1.5 space-y-1">
            {brief.needs.map((n, i) => <li key={i} className="flex gap-2 text-sm text-slate2"><span className="text-sage">·</span><span>{n}</span></li>)}
          </ul>
        </div>
      )}

      {brief.one_thing && (
        <div className="mt-4 rounded-xl border border-sage/30 bg-sage-soft/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">One caring thing</div>
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
    </div>
  );
}
