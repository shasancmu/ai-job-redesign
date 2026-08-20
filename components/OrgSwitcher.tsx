"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Item = { slug: string; name: string; logoUrl: string | null; role: string };

// A compact dropdown to switch the active white-label org (or go Personal).
// Only shown when the user belongs to at least one org. The panel portals to
// <body> so it clears the page's animation-transform stacking contexts (see
// AccountMenu for the full reasoning).
export default function OrgSwitcher({ orgs, activeSlug }: { orgs: Item[]; activeSlug: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  if (!orgs.length) return null;
  const active = orgs.find((o) => o.slug === activeSlug) || null;

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  }

  async function choose(slug: string | null) {
    setBusy(true);
    try {
      await fetch("/api/org/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: slug || "" }) });
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  const row = "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-mist ";

  const menu = open && pos && mounted
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div className="fixed z-[81] w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lift" style={{ top: pos.top, right: pos.right }}>
            {orgs.map((o) => (
              <button key={o.slug} onClick={() => choose(o.slug)} className={row + (o.slug === activeSlug ? "font-semibold text-ink" : "text-slate-700")}>
                {o.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.logoUrl} alt="" className="h-4 max-w-[72px] object-contain" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                )}
                <span className="flex-1 truncate">{o.name}</span>
                {o.role !== "member" && <span className="rounded-full bg-mist px-1.5 py-0.5 text-[10px] text-slate2">{o.role}</span>}
                {o.slug === activeSlug && <span className="text-sage">✓</span>}
              </button>
            ))}
            <div className="my-1 border-t border-line" />
            <button onClick={() => choose(null)} className={row + (!activeSlug ? "font-semibold text-ink" : "text-slate-700")}>
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="flex-1">Personal</span>
              {!activeSlug && <span className="text-sage">✓</span>}
            </button>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-sm font-medium text-ink transition hover:border-slate-300"
      >
        {active?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.logoUrl} alt="" className="h-4 max-w-[72px] object-contain" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-slate-300" />
        )}
        <span className="max-w-[120px] truncate">{active ? active.name : "Personal"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {menu}
    </div>
  );
}
