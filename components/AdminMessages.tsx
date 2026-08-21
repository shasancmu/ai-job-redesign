"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ContactMessage = {
  id: string;
  name: string | null;
  email: string;
  org: string | null;
  message: string;
  source: string | null;
  handled: boolean;
  created_at: string;
};

export default function AdminMessages({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"new" | "all">("new");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, body: any, tag: string) {
    setBusy(tag);
    try {
      await fetch("/api/admin/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      router.refresh();
    } finally { setBusy(null); }
  }

  const shown = messages.filter((m) => (filter === "new" ? !m.handled : true));

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 rounded-full bg-mist p-0.5 text-sm w-fit">
        <button onClick={() => setFilter("new")} className={"rounded-full px-3 py-1 font-medium " + (filter === "new" ? "bg-ink text-white" : "text-slate-500")}>New</button>
        <button onClick={() => setFilter("all")} className={"rounded-full px-3 py-1 font-medium " + (filter === "all" ? "bg-ink text-white" : "text-slate-500")}>All</button>
      </div>

      {shown.length === 0 && <p className="text-sm text-slate-400">No messages{filter === "new" ? " to review" : ""}.</p>}

      <div className="space-y-3">
        {shown.map((m) => (
          <div key={m.id} className={"card p-4 " + (m.handled ? "opacity-70" : "")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-ink">
                  {m.name || "—"}{" "}
                  <a href={`mailto:${m.email}`} className="font-normal text-sage underline">{m.email}</a>
                </div>
                <div className="text-xs text-slate-400">
                  {m.org ? `${m.org} · ` : ""}{new Date(m.created_at).toLocaleString()}{m.source ? ` · from ${m.source}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => act(m.id, { handled: !m.handled }, m.id + "h")} disabled={busy === m.id + "h"} className="btn-ghost text-xs">
                  {m.handled ? "Mark new" : "Mark handled"}
                </button>
                <button onClick={() => { if (confirm("Delete this message?")) act(m.id, { action: "delete" }, m.id + "d"); }} disabled={busy === m.id + "d"} className="text-xs text-slate-400 hover:text-clay">Delete</button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
