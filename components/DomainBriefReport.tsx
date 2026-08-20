"use client";

import { useMemo, useState } from "react";
import { Meter, StatTile, Sparkline, BarList, Drill, RankRow, PotChip, SummaryHero, SortControl } from "@/components/ReportKit";
import CollabGraph from "@/components/CollabGraph";
import Sankey from "@/components/Sankey";
import { classifyFirm, FIRM_TYPE_META } from "@/lib/firmType";
import { sciLink, SciLink } from "@/lib/scientifiqLinks";
import type { DomainBriefData, ExpertSummary } from "@/lib/domainBrief";

type Theme = { title: string; detail: string };
type Person = { name: string; why: string };
type Brief = {
  headline?: string;
  summary?: string;
  takeaway?: string;
  themes?: Theme[];
  standoutPeople?: Person[];
  trajectory?: string;
  gaps?: string[];
  note?: string;
};

function ExpertRow({ e, rank }: { e: ExpertSummary; rank: number }) {
  return (
    <RankRow
      rank={rank}
      title={e.name}
      sub={[e.org, e.subfields].filter(Boolean).join(" · ")}
      right={<span className="flex shrink-0 gap-1"><PotChip label="Sci" value={e.scipot} /><PotChip label="Com" value={e.compot} /></span>}
    >
      <div className="text-xs text-slate-400">{[e.totalPubs ? `${e.totalPubs} papers` : "", e.acaCites ? `${e.acaCites.toLocaleString()} citations` : ""].filter(Boolean).join(" · ")}</div>
      {e.bio && <p className="mt-1 text-sm leading-relaxed text-slate-600">{e.bio}</p>}
      {(e.representative || []).length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {e.representative.map((t, i) => <li key={i} className="text-xs text-slate-500">· {t}</li>)}
        </ul>
      )}
      <div className="mt-2"><SciLink href={sciLink.researcher(e.id, e.name)}>Full profile on Scientifiq</SciLink></div>
    </RankRow>
  );
}

const SORTS = [
  { key: "fit", label: "Best fit" },
  { key: "compot", label: "Commercial" },
  { key: "scipot", label: "Scientific" },
  { key: "relevance", label: "Relevance" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

export default function DomainBriefReport({ brief, data }: { brief: Brief; data: DomainBriefData }) {
  const experts = data.topExperts || [];
  const [sort, setSort] = useState<SortKey>("fit");
  const [firmFilter, setFirmFilter] = useState<"all" | "company" | "academic">("all");
  const sorted = useMemo(() => {
    if (sort === "fit") return experts; // as delivered: high commercial × relevance
    if (sort === "relevance") return [...experts].sort((a, b) => (a.relevanceRank ?? 0) - (b.relevanceRank ?? 0));
    return [...experts].sort((a, b) => ((b as any)[sort] || 0) - ((a as any)[sort] || 0));
  }, [experts, sort]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const trend = (data.yearTrend || []).map((y) => y.count);

  return (
    <div className="space-y-5">
      {/* LAYER 1 — a broad summary of what was found */}
      <SummaryHero eyebrow={`${data.domain} · ${data.scopeLabel}`} headline={brief.headline} body={brief.summary} takeaway={brief.takeaway} />

      {/* LAYER 2 — at a glance */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <StatTile label="Experts" value={data.researcherCount} hint="analyzed" />
        <StatTile label="Papers" value={data.paperCount} hint="analyzed" />
        <Meter label="Commercial" value={data.avgCommPot} hint="avg potential" />
        <Meter label="Scientific" value={data.avgSciPot} hint="avg potential" />
        {trend.length > 1 ? <Sparkline label="Trajectory" points={trend} hint={trend[trend.length - 1] >= trend[0] ? "rising" : "steady"} /> : <Meter label="Social" value={data.avgSocPot} hint="avg potential" />}
      </div>
      <p className="-mt-2 text-[11px] text-slate-400">Potential is Scientifiq&apos;s forward-looking score (predicted at publish, not citations). Counts are the most-relevant sample.</p>

      {/* Explore the whole domain on Scientifiq */}
      <div className="flex justify-end">
        <SciLink href={sciLink.search(data.domain)}>Explore &ldquo;{data.domain}&rdquo; on Scientifiq</SciLink>
      </div>

      {/* Top experts — scan the leaders, drill for detail */}
      {experts.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="eyebrow">The experts</h2>
            <SortControl options={SORTS as any} value={sort} onChange={(k) => setSort(k as SortKey)} />
          </div>
          <div className="card divide-y divide-line p-0">
            {top.map((e, i) => <ExpertRow key={e.id} e={e} rank={i + 1} />)}
          </div>
          {rest.length > 0 && (
            <div className="mt-2">
              <Drill title="More experts" count={rest.length}>
                <div className="-mx-1 divide-y divide-line">
                  {rest.map((e, i) => <ExpertRow key={e.id} e={e} rank={i + 6} />)}
                </div>
              </Drill>
            </div>
          )}
        </div>
      )}

      {/* Collaboration network + who-should-talk (the structural-hole insight) */}
      {data.collab && data.collab.nodes.length > 2 && (
        <div>
          <h2 className="eyebrow mb-2">Collaboration network</h2>
          <CollabGraph nodes={data.collab.nodes} edges={data.collab.edges} suggestions={data.collab.shouldTalk} />
        </div>
      )}

      {(data.collab?.shouldTalk || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-1">Who should talk (but doesn&apos;t)</h2>
          <p className="mb-2 text-xs text-slate-400">Experts working on very similar topics with no shared paper: collaborations waiting across a structural hole.</p>
          <div className="card divide-y divide-line p-0">
            {data.collab.shouldTalk.map((s, i) => (
              <div key={i} className="p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
                  <a href={sciLink.researcher(s.aId, s.aName)} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.aName}</a>
                  <span className="text-slate-300">&harr;</span>
                  <a href={sciLink.researcher(s.bId, s.bName)} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.bName}</a>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.sharedTopics.map((t, k) => <span key={k} className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate2">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Firms building on this science (patent citations, via Reliance on Science) */}
      {data.firms && data.firms.firms.length > 0 && (() => {
        const f = data.firms!;
        const pipeLinks = (f.pipeline?.links || []).filter((l) => firmFilter === "all" || classifyFirm(l.target) === firmFilter);
        const firmList = f.firms.filter((x) => firmFilter === "all" || classifyFirm(x.name) === firmFilter);
        const FILTERS = [
          { key: "all", label: "All" },
          { key: "company", label: "Companies" },
          { key: "academic", label: "Universities" },
        ] as const;
        return (
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="eyebrow">From science to industry</h2>
              <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-0.5 text-xs">
                {FILTERS.map((o) => (
                  <button key={o.key} onClick={() => setFirmFilter(o.key)} className={"rounded-full px-2.5 py-1 font-medium transition " + (firmFilter === o.key ? "bg-ink text-white" : "text-slate2 hover:bg-mist")}>{o.label}</button>
                ))}
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              The pipeline from researchers to the {firmFilter === "company" ? "companies" : firmFilter === "academic" ? "universities and research bodies" : "universities and companies"} whose patents cite their work, {f.citingPatentCount.toLocaleString()} citing patents in all (front-page citations, Reliance on Science). Ribbon width = papers cited.
            </p>
            {pipeLinks.length > 0 ? (
              <Sankey left={f.pipeline.researchers} right={f.pipeline.firms} links={pipeLinks} typeOf={classifyFirm} />
            ) : (
              <div className="rounded-xl border border-line bg-mist py-6 text-center text-sm text-slate2">No {firmFilter === "company" ? "companies" : firmFilter === "academic" ? "universities" : "citing patents"} in this scope to trace a pipeline.</div>
            )}
            <div className="mt-2.5">
              <Drill title={`All ${firmFilter === "company" ? "companies" : firmFilter === "academic" ? "universities & research" : "assignees"} ranked`} count={firmList.length}>
                <div className="space-y-1">
                  {firmList.slice(0, 15).map((x, i) => {
                    const meta = FIRM_TYPE_META[classifyFirm(x.name)];
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} title={meta.label} />
                        <span className="flex-1 truncate text-xs text-slate2" title={x.name}>{x.name}</span>
                        <span className="w-6 text-right text-xs font-semibold text-slate2">{x.patents}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Number = distinct citing patents held. {f.resolvedPatentCount} of {f.citingPatentCount} citing patents resolved to an assignee.</p>
              </Drill>
            </div>
          </div>
        );
      })()}

      {/* LAYER 3 — evidence, collapsed */}
      <div className="space-y-2.5">
        {(brief.themes || []).length > 0 && (
          <Drill title="Where the expertise concentrates" count={brief.themes!.length} defaultOpen>
            <div className="space-y-3">
              {brief.themes!.map((t, i) => (
                <div key={i}>
                  <div className="text-sm font-bold text-ink">{t.title}</div>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{t.detail}</p>
                </div>
              ))}
            </div>
          </Drill>
        )}

        {(data.standoutPapers || []).length > 0 && (
          <Drill title="Standout work" count={data.standoutPapers.length}>
            <div className="-mx-1 divide-y divide-line">
              {data.standoutPapers.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-ink hover:underline">{p.title}</a> : <span className="text-sm font-medium text-ink">{p.title}</span>}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                      <span>{[p.year, p.authors, p.journal].filter(Boolean).join(" · ")}</span>
                      <SciLink href={sciLink.paper(p.id, p.title)}>Scientifiq</SciLink>
                    </div>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-1"><PotChip label="Com" value={p.compot} /><PotChip label="Sci" value={p.scipot} /></span>
                </div>
              ))}
            </div>
          </Drill>
        )}

        {(data.subfieldBreakdown || []).length > 0 && (
          <Drill title="Sub-field composition" count={data.subfieldBreakdown.length}>
            <BarList rows={data.subfieldBreakdown.map((s) => ({ label: s.name, value: s.count }))} />
            {brief.trajectory && <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-slate-600">{brief.trajectory}</p>}
          </Drill>
        )}

        {(brief.gaps || []).length > 0 && (
          <Drill title="Whitespace & gaps" count={brief.gaps!.length} tone="warn">
            <ul className="space-y-2">
              {brief.gaps!.map((g, i) => <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink"><span className="mt-0.5 text-clay">!</span><span>{g}</span></li>)}
            </ul>
          </Drill>
        )}
      </div>

      {brief.note && <p className="text-[11px] leading-relaxed text-slate-400">{brief.note}</p>}
    </div>
  );
}
