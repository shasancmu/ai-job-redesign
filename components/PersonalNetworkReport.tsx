"use client";

import BottomLine from "@/components/BottomLine";
import EgoNetworkGraph from "@/components/EgoNetworkGraph";
import { brokerMeta, constraintBand, computeEgoMetrics, type Contact, type Ties, type EgoMetrics } from "@/lib/egonet";

type Move = { title: string; why: string; how: string };
type PersonNote = { name: string; kind: "invest" | "reconnect" | "manage" | "bridge"; note: string };
type Report = {
  bottomLine?: any;
  headline?: string;
  strengths?: string[];
  gaps?: string[];
  moves?: Move[];
  people?: PersonNote[];
  note?: string;
};

const KIND: Record<PersonNote["kind"], { label: string; chip: string }> = {
  invest: { label: "Invest", chip: "bg-sage-soft text-sage" },
  reconnect: { label: "Reconnect", chip: "bg-sky-soft text-sky" },
  manage: { label: "Manage", chip: "bg-clay-soft text-clay" },
  bridge: { label: "Protect the bridge", chip: "bg-amber-soft text-amber" },
};

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-xs leading-snug text-slate2">{hint}</div>
    </div>
  );
}

export default function PersonalNetworkReport({
  report,
  metrics,
  contacts,
  ties,
}: {
  report: Report;
  metrics?: EgoMetrics;
  contacts: Contact[];
  ties: Ties;
}) {
  // Recompute from the roster if a snapshot wasn't passed, so the tiles always
  // match the graph.
  const m = metrics || computeEgoMetrics(contacts, ties);
  const shape = brokerMeta(m.brokerLabel);
  const band = constraintBand(m.constraint);
  const bandHint = band === "low" ? "open, many structural holes" : band === "high" ? "boxed into one group" : "a mix of open and closed";

  return (
    <div className="space-y-6">
      <div data-guide="headline">
        {report.bottomLine ? (
          <BottomLine b={report.bottomLine} />
        ) : report.headline ? (
          <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your network</div>
            <p className="mt-1 text-2xl font-bold leading-snug text-ink">{report.headline}</p>
          </div>
        ) : null}
      </div>

      {/* The graph */}
      <div data-guide="metrics">
        <h2 className="eyebrow mb-2">Your network, mapped</h2>
        <EgoNetworkGraph contacts={contacts} ties={ties} />
      </div>

      {/* Shape banner */}
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + shape.chip}>{shape.title}</span>
          <span className="text-sm font-semibold text-ink">{m.clusters} separate {m.clusters === 1 ? "world" : "worlds"} · {m.domainsPresent} of 4 arenas</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{shape.blurb}</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Contacts" value={String(m.size)} hint={`${m.edges} ties among them`} />
        <Stat label="Density" value={m.density.toFixed(2)} hint="how interconnected (0 open → 1 closed)" />
        <Stat label="Effective size" value={m.effectiveSize.toFixed(1)} hint="non-redundant contacts (Burt)" />
        <Stat label="Constraint" value={m.constraint.toFixed(2)} hint={`${bandHint} (Burt)`} />
        <Stat label="Diversity" value={m.domainDiversity.toFixed(2)} hint={`${m.domainsPresent} of 4 worlds represented`} />
        <Stat label="Energy" value={(m.energyBalance > 0 ? "+" : "") + m.energyBalance} hint={`${m.energizers} energize · ${m.drainers} drain`} />
      </div>

      {/* Tie strength + worlds mini-bars */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tie strength (Granovetter)</div>
          <MiniBar rows={[
            { label: "Strong", value: m.strong, color: "#3F7A52" },
            { label: "Medium", value: m.medium, color: "#CE8F2C" },
            { label: "Weak", value: m.weak, color: "#9aa7b4" },
          ]} total={m.size} />
          <p className="mt-2 text-xs leading-snug text-slate2">Weak ties reach information your close circle can't. An all-strong network is comfortable but redundant.</p>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Worlds you reach</div>
          <MiniBar rows={[
            { label: "Inside org", value: m.domainCounts.inside, color: "#3F7A52" },
            { label: "Outside org", value: m.domainCounts.outside, color: "#3B7FB5" },
            { label: "Field & industry", value: m.domainCounts.industry, color: "#CE8F2C" },
            { label: "Personal", value: m.domainCounts.personal, color: "#C06A47" },
          ]} total={m.size} />
          <p className="mt-2 text-xs leading-snug text-slate2">A thin or empty arena is often the highest-return place to build.</p>
        </div>
      </div>

      {/* Strengths */}
      {(report.strengths || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">What's working</h2>
          <div className="card p-5">
            <ul className="space-y-2">
              {report.strengths!.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700"><span className="mt-0.5 text-sage">✓</span><span>{s}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Gaps */}
      {(report.gaps || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Where it's thin</h2>
          <div className="rounded-2xl border border-clay/30 bg-clay-soft/40 p-5">
            <ul className="space-y-2">
              {report.gaps!.map((g, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink"><span className="mt-0.5 text-clay">!</span><span>{g}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Moves */}
      {(report.moves || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">Moves to make</h2>
          <div className="space-y-3">
            {report.moves!.map((mv, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-ink">{mv.title}</div>
                    {mv.why && <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{mv.why}</p>}
                    {mv.how && <div className="mt-2 rounded-lg bg-mist px-3 py-2 text-sm text-slate-700"><span className="font-medium text-ink">First step:</span> {mv.how}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* People to act on */}
      {(report.people || []).length > 0 && (
        <div>
          <h2 className="eyebrow mb-2">People to act on</h2>
          <div className="card divide-y divide-line p-0">
            {report.people!.map((p, i) => {
              const k = KIND[p.kind] || KIND.invest;
              return (
                <div key={i} className="flex items-start gap-3 p-4">
                  <span className={"mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " + k.chip}>{k.label}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">{p.name}</div>
                    <div className="text-sm leading-relaxed text-slate-600">{p.note}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {report.note && (
        <div className="rounded-2xl border border-line bg-mist p-4 text-sm leading-relaxed text-slate-600">{report.note}</div>
      )}
    </div>
  );
}

function MiniBar({ rows, total }: { rows: { label: string; value: number; color: string }[]; total: number }) {
  const max = Math.max(1, total);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-xs text-slate2">{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
          <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate2">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
