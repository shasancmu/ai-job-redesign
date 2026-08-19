"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// The quiet "…" menu for the facilitator hub: rarely-used and destructive
// actions (Costs, and the demo-data dev tools) live here so they don't crowd
// or endanger the primary actions in the header.
export default function FacilitatorMenu({ code = "DEMOCOHORT" }: { code?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "seed" | "clear">(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function seed() {
    setBusy("seed");
    try {
      const r = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (r.ok) router.push(`/facilitator?cohort=${encodeURIComponent(d.cohort)}`);
      else window.alert(d.error || "Couldn't generate demo data.");
    } catch {
      window.alert("Couldn't generate demo data.");
    }
    setBusy(null);
    setOpen(false);
  }

  async function clear() {
    if (!window.confirm(`Remove the demo cohort "${code}" and all its synthetic users and data?`)) return;
    setBusy("clear");
    try {
      const r = await fetch(`/api/dev/seed?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) window.alert(d.error || "Couldn't clear.");
      router.refresh();
    } catch {
      window.alert("Couldn't clear.");
    }
    setBusy(null);
    setOpen(false);
  }

  const item = "flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-mist disabled:opacity-50";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-lg leading-none text-slate-500 hover:border-slate-300 hover:text-ink"
      >
        …
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
          <Link href="/admin/usage" className={item} onClick={() => setOpen(false)}>
            <span aria-hidden>📈</span> Usage
          </Link>
          <Link href="/facilitator/experiments" className={item} onClick={() => setOpen(false)}>
            <span aria-hidden>🧪</span> Experiments
          </Link>
          <Link href="/admin/costs" className={item} onClick={() => setOpen(false)}>
            <span aria-hidden>📊</span> Costs
          </Link>
          <div className="my-1 border-t border-line" />
          <div className="px-3.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Developer</div>
          <button onClick={seed} disabled={busy !== null} className={item}>
            <span aria-hidden>✨</span> {busy === "seed" ? "Generating…" : "Fill demo cohort"}
          </button>
          <button onClick={clear} disabled={busy !== null} className={item + " text-clay hover:text-clay"}>
            <span aria-hidden>🗑</span> {busy === "clear" ? "Clearing…" : "Clear demo cohort"}
          </button>
        </div>
      )}
    </div>
  );
}
