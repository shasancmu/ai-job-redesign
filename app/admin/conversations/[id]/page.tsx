import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/orgs";
import { getConversation, personHandle } from "@/lib/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · conversation" };

export default async function ConversationDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const id = decodeURIComponent(params.id);
  const { header, turns } = await getConversation(id);
  if (!header) notFound();

  const d = header.dynamics;
  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-line bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-ink tabular-nums">{value}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <Link href="/admin/conversations" className="text-sm text-slate2 hover:text-ink">← Conversations</Link>
      </header>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-ink">{personHandle(header.person_id)}</span>
        {header.module && <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{header.module}</span>}
        {header.cohort && <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">cohort {header.cohort}</span>}
        {header.intervention && <span className="rounded-full bg-sky-soft/50 px-2 py-0.5 text-[11px] text-slate-600">arm: {header.intervention}</span>}
        <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (header.ended_at ? "bg-sage-soft text-sage" : "bg-amber-soft text-amber")}>{header.ended_at ? "finished" : "open"}</span>
      </div>
      <p className="mb-5 font-mono text-xs text-slate-400 break-all">{header.conversation_id}</p>

      {/* Outcomes + dynamics */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {stat("Outcome", header.outcome == null ? "—" : String(header.outcome))}
        {stat("Real outcome", header.real_outcome == null ? "—" : String(header.real_outcome))}
        {d && stat("Depth", String(d.depth))}
        {d && stat("Movement", (d.movement > 0 ? "+" : "") + d.movement)}
        {d && stat("Human turns", String(d.humanTurns))}
        {d && stat("Drive", Math.round(d.drive * 100) + "%")}
        {d && stat("Question rate", Math.round(d.questionRate * 100) + "%")}
        {d && stat("Human avg", d.humanAvgWords + "w")}
      </div>

      {/* Transcript */}
      <h2 className="eyebrow mb-3">Transcript · {turns.length} turns</h2>
      {turns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">No turns recorded for this conversation.</div>
      ) : (
        <div className="space-y-3">
          {turns.map((t) => (
            <div key={t.turn_index} className={t.speaker === "human" ? "flex justify-end" : "flex justify-start"}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm " + (t.speaker === "human" ? "bg-ink text-white" : "border border-line bg-white text-slate-700")}>
                <div className={"mb-0.5 text-[10px] uppercase tracking-wide " + (t.speaker === "human" ? "text-white/60" : "text-slate-400")}>
                  {t.speaker}{t.modality === "voice" ? " · voice" : ""}
                </div>
                <div className="whitespace-pre-wrap">{t.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
