"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { domainsFor, answeredCount, type DiscVariant } from "@/lib/disclosure";

export default function DisclosureRoom({
  me,
  session,
  token,
  initialWorkspace,
  variant,
}: {
  me: string;
  session: any;
  token: string;
  initialWorkspace: any;
  variant: DiscVariant;
}) {
  const supabase = createClient();
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const isAi = variant === "haip" ? true : !!state.isAi;
  const domains = domainsFor(variant, isAi);
  const responses: Record<string, string> = state.responses || {};
  const submitted = !!state.submittedAt;

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = origin ? `${origin}/disclose/${token}` : "";

  // Autosave the buyer's setup (vendor/product/isAi).
  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const setCanvas = (patch: Record<string, any>) => {
    const canvas = { ...state, ...patch };
    setWs((w: any) => ({ ...w, canvas }));
    pending.current = { ...pending.current, canvas };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };

  async function refresh() {
    const { data } = await supabase.from("workspaces").select("*").eq("id", ws.id).maybeSingle();
    if (data) setWs(data);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">
            {variant === "haip" ? "Healthcare AI Vendor Disclosure (HAIP)" : "Vendor Disclosure"}
          </span>
        </div>
      </div>

      {/* Setup */}
      <div className="card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="lbl">Vendor</label>
            <input className="field" placeholder="e.g. Acme Health AI" value={state.vendor || ""} onChange={(e) => setCanvas({ vendor: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Product / system</label>
            <input className="field" placeholder="e.g. SepsisWatch" value={state.product || ""} onChange={(e) => setCanvas({ product: e.target.value })} />
          </div>
        </div>
        {variant === "general" && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={!!state.isAi} onChange={(e) => setCanvas({ isAi: e.target.checked })} />
            This vendor is AI/ML-based. Add the model-performance, subgroup-bias, and drift questions.
          </label>
        )}
      </div>

      {/* Share link */}
      <div className="card mt-4 p-5">
        <div className="text-sm font-bold text-ink">Send this link to your vendor</div>
        <p className="mt-1 text-xs text-slate-400">They complete the disclosure with no account. It covers all five framework domains ({domains.reduce((n, d) => n + d.questions.length, 0)} questions).</p>
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={link} className="field flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button
            onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="btn-primary shrink-0 text-sm"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Status / response */}
      <div className="mt-4">
        {!submitted ? (
          <div className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">
            Waiting for the vendor to respond. Share the link above, then{" "}
            <button onClick={refresh} className="font-medium text-ink underline">check for a response</button>.
          </div>
        ) : (
          <Response
            domains={domains}
            responses={responses}
            review={state.review}
            code={session.code}
            onReviewed={(r) => setCanvas({ review: r })}
            canReview={answeredCount(responses) >= 3}
          />
        )}
      </div>
    </main>
  );
}

function Response({
  domains,
  responses,
  review,
  code,
  onReviewed,
  canReview,
}: {
  domains: ReturnType<typeof domainsFor>;
  responses: Record<string, string>;
  review: any;
  code: string;
  onReviewed: (r: any) => void;
  canReview: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/disclose/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json();
      if (res.ok && d.review) onReviewed(d.review);
      else setErr(d.error || "Couldn't run the review.");
    } catch { setErr("Couldn't run the review."); }
    setBusy(false);
  }

  const sev = (s: string) => (s === "red" ? "bg-clay-soft text-clay" : "bg-amber-soft text-amber");

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm font-semibold text-ink">The vendor responded.</div>
        <div className="flex items-center gap-3">
          <Link href={`/disclosure/${code}`} className="text-sm font-medium text-ink hover:underline">View / print →</Link>
          <button onClick={run} disabled={busy || !canReview} className="btn-primary text-sm">{busy ? "Reviewing…" : review ? "↻ Re-review" : "✨ Review against the framework"}</button>
        </div>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}

      {/* AI review */}
      {review && (
        <div className="card p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-bold text-ink">Disclosure review</div>
            {typeof review.score === "number" && <div className="text-2xl font-bold text-ink">{review.score}<span className="text-sm text-slate-400">/100</span></div>}
          </div>
          {review.overall && <p className="mt-1 text-sm leading-relaxed text-slate2">{review.overall}</p>}
          {Array.isArray(review.domains) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {review.domains.map((d: any) => (
                <div key={d.key} className="rounded-lg bg-mist px-3 py-2 text-xs">
                  <div className="flex justify-between"><span className="font-semibold text-ink">{title(domains, d.key)}</span><span className="text-slate-500">{d.score}/100</span></div>
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
                    <span className="text-slate2"><b className="text-ink">{f.topic}:</b> {f.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(review.followups) && review.followups.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Send back to the vendor</div>
              <ul className="space-y-1">
                {review.followups.map((q: string, i: number) => <li key={i} className="text-sm text-slate2">• {q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Raw responses */}
      <div className="space-y-4">
        {domains.map((d) => (
          <div key={d.key} className="card p-5">
            <div className="text-sm font-bold text-ink">{d.title}</div>
            <div className="mt-3 space-y-3">
              {d.questions.map((q) => (
                <div key={q.key}>
                  <div className="text-xs font-semibold text-slate-500">{q.label}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate2">{(responses[q.key] || "").trim() || <span className="text-slate-300">— no answer —</span>}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function title(domains: ReturnType<typeof domainsFor>, key: string): string {
  return domains.find((d) => d.key === key)?.title || key;
}
