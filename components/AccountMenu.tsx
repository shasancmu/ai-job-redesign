"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Labels = { reports: string; achievements: string; profile: string; signOut: string; tour: string };

// One dropdown for every account/nav action, so the header stays a brand on the
// left and a single control on the right instead of a row of pills.
//
// The panel is rendered through a portal to <body>. That matters: page sections
// (the header, the catalog) sit inside stacking contexts created by the entrance
// animation's transform, so an in-place absolute panel gets trapped *below*
// later content no matter its z-index. A body-level portal escapes all of that.
export default function AccountMenu({
  name,
  facilitator = false,
  director = false,
  superadmin = false,
  labels,
  dataTour,
  dashboard = false,
  tour = true,
}: {
  name: string;
  facilitator?: boolean; // has facilitator access → show the Cohorts link
  director?: boolean; // runs an org → show the Organization console
  superadmin?: boolean; // platform owner → also show the Orgs console
  labels: Labels;
  dataTour?: string;
  dashboard?: boolean;
  tour?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  }
  function toggle() {
    if (open) { setOpen(false); return; }
    place();
    setOpen(true);
  }

  // Close (rather than chase) the button when the page scrolls or resizes.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  const initials = (name || "You")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "Y";

  const item = "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-mist";
  const section = "px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400";
  // A role group: a divider, then a small uppercase header, so each scope
  // (teaching, your org, platform admin) reads as its own separate block.
  const group = (label: string, children: React.ReactNode) => (
    <>
      <div className="my-1 border-t border-line" />
      <div className={section}>{label}</div>
      {children}
    </>
  );

  const menu = open && pos && mounted
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[81] w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lift"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="truncate px-2.5 py-1.5 text-xs font-medium text-slate2">{name}</div>
            <div className="mb-1 border-t border-line" />
            {dashboard && <a href="/dashboard" className={item}>Dashboard</a>}
            <a href="/reports" className={item}>{labels.reports}</a>
            <a href="/achievements" className={item}>{labels.achievements}</a>
            <a href="/profile" className={item}>{labels.profile}</a>
            {tour && <button onClick={() => { setOpen(false); window.dispatchEvent(new Event("app:start-tour")); }} className={item}>{labels.tour}</button>}
            {(director || superadmin) && <a href="/build" className={item}>Build a module</a>}
            {(facilitator || director || superadmin) && <a href="/decks" className={item}>Presentations</a>}

            {facilitator && group("Teaching", (
              <a href="/facilitator" className={item}>Cohorts</a>
            ))}

            {director && group("Your organization", (
              <>
                <a href="/team" className={item}>Overview</a>
                <a href="/team/usage" className={item}>Usage</a>
                <a href="/team/certificates" className={item}>Certificates</a>
              </>
            ))}

            {superadmin && group("Platform admin", (
              <>
                <a href="/admin/usage" className={item}>Usage</a>
                <a href="/admin/ai" className={item}>AI spend &amp; health</a>
                <a href="/admin/costs" className={item}>Module unit costs</a>
                <a href="/admin/orgs" className={item}>Organizations</a>
                <a href="/admin/certificates" className={item}>Certificates</a>
                <a href="/admin/messages" className={item}>Contact messages</a>
              </>
            ))}

            <div className="my-1 border-t border-line" />
            <a href="/contact" className={item}>Send feedback</a>
            <div className="my-1 border-t border-line" />
            <form action="/auth/signout" method="post">
              <button className={item + " text-slate-500"}>{labels.signOut}</button>
            </form>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        data-tour={dataTour}
        onClick={toggle}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-1 pr-2 transition hover:border-slate-300"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "var(--brand, #4A6A4E)" }}
        >
          {initials}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-400"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {menu}
    </div>
  );
}
