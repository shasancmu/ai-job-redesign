"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// The facilitator hub's admin utilities, laid out on the page (they used to hide
// behind a "…" header menu). Links are plain navigation; the Developer tools are
// destructive and superadmin-only.
export default function AdminTools({ superadmin = false, code = "DEMOCOHORT" }: { superadmin?: boolean; code?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "seed" | "clear">(null);

  async function seed() {
    setBusy("seed");
    try {
      const r = await fetch("/api/dev/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await r.json();
      if (r.ok) router.push(`/facilitator?cohort=${encodeURIComponent(d.cohort)}`);
      else window.alert(d.error || "Couldn't generate demo data.");
    } catch { window.alert("Couldn't generate demo data."); }
    setBusy(null);
  }

  async function clear() {
    if (!window.confirm(`Remove the demo cohort "${code}" and all its synthetic users and data?`)) return;
    setBusy("clear");
    try {
      const r = await fetch(`/api/dev/seed?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) window.alert(d.error || "Couldn't clear.");
      router.refresh();
    } catch { window.alert("Couldn't clear."); }
    setBusy(null);
  }

  const card = "card group flex items-center gap-3 p-4 transition hover:shadow-lift";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/usage" className={card}>
          <span className="text-xl" aria-hidden>📈</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">Usage</span>
            <span className="block text-xs text-slate2">Who&apos;s using what, across every account.</span>
          </span>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
        <Link href="/admin/experiments" className={card}>
          <span className="text-xl" aria-hidden>🧪</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">A/B testing</span>
            <span className="block text-xs text-slate2">A/B test the AI interviews you run.</span>
          </span>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
        <Link href="/admin/costs" className={card}>
          <span className="text-xl" aria-hidden>📊</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">Costs</span>
            <span className="block text-xs text-slate2">API spend and token usage.</span>
          </span>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
        {superadmin && (
          <Link href="/admin/messages" className={card}>
            <span className="text-xl" aria-hidden>✉️</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">Messages</span>
              <span className="block text-xs text-slate2">Contact-form submissions.</span>
            </span>
            <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
          </Link>
        )}
      </div>

      {superadmin && (
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Developer</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={seed} disabled={busy !== null} className="btn-ghost text-sm">
              <span aria-hidden>✨</span> {busy === "seed" ? "Generating…" : "Fill demo cohort"}
            </button>
            <button onClick={clear} disabled={busy !== null} className="btn-ghost text-sm text-clay hover:text-clay">
              <span aria-hidden>🗑</span> {busy === "clear" ? "Clearing…" : "Clear demo cohort"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
