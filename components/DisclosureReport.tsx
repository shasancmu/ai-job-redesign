"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import type { DiscDomain, DiscVariant } from "@/lib/disclosure";

// Printable disclosure + review artifact. Top bar hidden on print.
export default function DisclosureReport({
  code,
  variant,
  vendor,
  product,
  submittedAt,
  domains,
  responses,
  review,
}: {
  code: string;
  variant: DiscVariant;
  vendor: string;
  product: string;
  submittedAt: string;
  domains: DiscDomain[];
  responses: Record<string, string>;
  review: any;
}) {
  const sev = (s: string) => (s === "red" ? "bg-clay-soft text-clay" : "bg-amber-soft text-amber");
  const dt = new Date(submittedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href={`/room/${code}`} className="btn-ghost text-sm">← Back</Link>
          <button onClick={() => window.print()} className="btn-primary text-sm">Print / Save PDF</button>
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {variant === "haip" ? "Healthcare AI Vendor Disclosure: HAIP framework" : "Vendor Disclosure"}
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">{product || vendor || "Vendor disclosure"}</h1>
      <p className="mt-0.5 text-sm text-slate-500">{vendor && product ? `${vendor} · ` : ""}Submitted {dt}</p>

      {/* Review summary */}
      {review && (
        <section className="mt-6 rounded-xl border border-line bg-mist p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-bold text-ink">Disclosure review</div>
            {typeof review.score === "number" && <div className="text-2xl font-bold text-ink">{review.score}<span className="text-sm text-slate-400">/100</span></div>}
          </div>
          {review.overall && <p className="mt-1 text-sm leading-relaxed text-slate-600">{review.overall}</p>}
          {Array.isArray(review.domains) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {review.domains.map((d: any) => (
                <div key={d.key} className="rounded-lg bg-white px-3 py-2 text-xs">
                  <div className="flex justify-between"><span className="font-semibold text-ink">{domains.find((x) => x.key === d.key)?.title || d.key}</span><span className="text-slate-500">{d.score}/100</span></div>
                  <div className="text-slate2">{d.summary}</div>
                </div>
              ))}
            </div>
          )}
          {Array.isArray(review.flags) && review.flags.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Flags</div>
              <div className="space-y-1.5">
                {review.flags.map((f: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={"mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase " + sev(f.severity)}>{f.severity}</span>
                    <span className="text-slate-600"><b className="text-ink">{f.topic}:</b> {f.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(review.followups) && review.followups.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Follow-ups for the vendor</div>
              <ul className="space-y-1">{review.followups.map((q: string, i: number) => <li key={i} className="text-sm text-slate-600">• {q}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      {/* Full responses by domain */}
      <div className="mt-6 space-y-6">
        {domains.map((d, di) => (
          <section key={d.key} className="break-inside-avoid">
            <div className="mb-2 border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Domain {di + 1} · {d.title}
            </div>
            <div className="space-y-3">
              {d.questions.map((q) => (
                <div key={q.key} className="break-inside-avoid">
                  <div className="text-sm font-semibold text-ink">{q.label}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {(responses[q.key] || "").trim() || <span className="text-slate-300">— no answer —</span>}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400 print:mt-4">
        Framework adapted from the Health AI Partnership (HAIP) AI Vendor Disclosure Framework.
      </p>
    </main>
  );
}
