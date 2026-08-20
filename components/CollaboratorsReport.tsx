"use client";

import { useState } from "react";
import BottomLine from "@/components/BottomLine";

type Match = {
  index: number;
  name: string;
  org?: string;
  subfields?: string;
  bio?: string;
  scipot?: number;
  compot?: number;
  why: string;
  propose: string;
  intro: string;
};
type Report = { bottomLine?: any; matches?: Match[]; note?: string };

function Pot({ label, value }: { label: string; value?: number }) {
  const v = Math.round(value || 0);
  const color = v >= 80 ? "#3F7A52" : v >= 60 ? "#CE8F2C" : "#9aa7b4";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-slate2">
      {label}<span className="font-bold" style={{ color }}>{v}</span>
    </span>
  );
}

function IntroBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded-lg bg-mist p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Draft intro</span>
        <button
          onClick={() => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
          className="text-[11px] font-medium text-slate2 hover:text-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

export default function CollaboratorsReport({ report, scopeLabel }: { report: Report; scopeLabel?: string }) {
  const matches = report.matches || [];
  return (
    <div className="space-y-6">
      {report.bottomLine && <BottomLine b={report.bottomLine} />}

      <div>
        <h2 className="eyebrow mb-2">Complementary collaborators{scopeLabel ? ` at ${scopeLabel}` : ""}</h2>
        <div className="space-y-3">
          {matches.map((m, i) => (
            <div key={i} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                  <span className="text-base font-bold text-ink">{m.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pot label="Sci" value={m.scipot} />
                  <Pot label="Com" value={m.compot} />
                </div>
              </div>
              {(m.org || m.subfields) && <div className="mt-0.5 pl-8 text-xs text-slate-400">{[m.org, m.subfields].filter(Boolean).join(" · ")}</div>}
              <div className="mt-2 pl-8">
                <p className="text-sm leading-relaxed text-slate-700"><span className="font-semibold text-ink">Why them:</span> {m.why}</p>
                {m.propose && <p className="mt-1.5 text-sm leading-relaxed text-slate-700"><span className="font-semibold text-ink">Propose:</span> {m.propose}</p>}
                {m.intro && <IntroBox text={m.intro} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {report.note && <div className="rounded-2xl border border-line bg-mist p-4 text-sm leading-relaxed text-slate-600">{report.note}</div>}
    </div>
  );
}
