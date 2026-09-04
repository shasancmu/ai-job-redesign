"use client";

type Expert = { id: string; name: string; org: string; city?: string; country?: string; km?: number; compot: number; scipot: number; fields: string; keywords: string; representative: string[] };
type Ladder = { local: Expert[]; national: Expert[]; global: Expert[]; anchor: { label: string } | null; countryName?: string };

function ExpertCard({ e, showKm }: { e: Expert; showKm?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="font-semibold text-ink">{e.name}</div>
        <div className="text-[11px] tabular-nums text-slate-400">commercial potential <span className="font-semibold text-sage">{e.compot}</span></div>
      </div>
      <div className="text-sm text-slate2">{e.org}{e.city ? <span className="text-slate-400"> · {e.city}{e.country && e.country !== e.city ? `, ${e.country}` : ""}</span> : null}{showKm && e.km != null ? <span className="font-medium text-ink"> · {e.km} km away</span> : null}</div>
      {e.fields && <div className="mt-1 text-xs text-slate-400">{e.fields}</div>}
      {e.representative?.length > 0 && <div className="mt-1 text-xs italic text-slate-500">&ldquo;{e.representative[0]}&rdquo;</div>}
    </div>
  );
}

function Tier({ title, note, experts, showKm }: { title: string; note?: string; experts: Expert[]; showKm?: boolean }) {
  if (!experts.length) return null;
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
        {note && <div className="text-[11px] text-slate-400">{note}</div>}
      </div>
      <div className="mt-2 space-y-2">{experts.map((e) => <ExpertCard key={e.id} e={e} showKm={showKm} />)}</div>
    </div>
  );
}

export default function NearestExpertResult({ plan, ladder }: { plan: any; ladder: Ladder }) {
  return (
    <div className="space-y-5">
      {(plan?.framing || (plan?.areas || []).length > 0) && (
        <div className="card p-5">
          {plan?.framing && <p className="text-base font-medium text-ink">{plan.framing}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(plan?.terms || []).map((t: string) => <span key={t} className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-slate2">{t}</span>)}
          </div>
        </div>
      )}
      <Tier title="Nearest to you" note={ladder.anchor && ladder.local[0]?.km != null ? `closest is ${ladder.local[0].km} km from ${ladder.anchor.label}` : ladder.countryName} experts={ladder.local} showKm />
      <Tier title={`National${ladder.countryName ? ` — ${ladder.countryName}` : ""}`} note="highest commercial potential in your country" experts={ladder.national} />
      <Tier title="Global frontier" note="the world leaders on this problem" experts={ladder.global} />
    </div>
  );
}
