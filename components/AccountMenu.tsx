"use client";

import { useState } from "react";

type Labels = { reports: string; profile: string; facilitator: string; orgs: string; signOut: string; tour: string };

// One dropdown for every account/nav action, so the dashboard header stays a
// brand on the left and a single control on the right instead of a row of pills.
export default function AccountMenu({
  name,
  admin,
  labels,
  dataTour,
  dashboard = false,
  tour = true,
}: {
  name: string;
  admin: boolean;
  labels: Labels;
  dataTour?: string;
  dashboard?: boolean;
  tour?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initials = (name || "You")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "Y";

  const item = "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-mist";

  return (
    <div className="relative">
      <button
        data-tour={dataTour}
        onClick={() => setOpen((o) => !o)}
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

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lift">
            <div className="truncate px-2.5 py-1.5 text-xs font-medium text-slate2">{name}</div>
            <div className="mb-1 border-t border-line" />
            {dashboard && <a href="/dashboard" className={item}>Dashboard</a>}
            <a href="/reports" className={item}>{labels.reports}</a>
            <a href="/profile" className={item}>{labels.profile}</a>
            {tour && <button onClick={() => { setOpen(false); window.dispatchEvent(new Event("app:start-tour")); }} className={item}>{labels.tour}</button>}
            {admin && (
              <>
                <div className="my-1 border-t border-line" />
                <a href="/facilitator" className={item}>{labels.facilitator}</a>
                <a href="/admin/orgs" className={item}>{labels.orgs}</a>
              </>
            )}
            <div className="my-1 border-t border-line" />
            <form action="/auth/signout" method="post">
              <button className={item + " text-slate-500"}>{labels.signOut}</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
