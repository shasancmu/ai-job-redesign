import Link from "next/link";
import { boardMember, type BoardEntry } from "@/lib/board";
import { loadOwnerReport } from "@/lib/reportPage";
import BoardVerdict from "@/components/BoardVerdict";
import ShareReport from "@/components/ShareReport";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function BoardView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const decision: string = canvas.decision || "";
  const transcript: BoardEntry[] = canvas.transcript || [];
  const verdict = canvas.verdict;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          {verdict && <ShareReport code={code} title="An AI Board verdict" text="Here's what my AI Board decided, on Superadditive:" />}
          <Link href={`/room/${code}`} className="btn-ghost text-sm">← Back to the board</Link>
        </div>
      </header>

      <div className="mb-6">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your AI Board</div>
        <h1 className="mt-1 text-3xl text-ink">{decision || "Your decision"}</h1>
      </div>

      {verdict && <BoardVerdict verdict={verdict} />}

      {transcript.length > 0 && (
        <div className="mt-8">
          <h2 className="eyebrow mb-3">The debate</h2>
          <div className="space-y-3">
            {transcript.map((e, i) => {
              if (e.who === "you") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-sm text-white">{e.text}</div>
                  </div>
                );
              }
              const m = boardMember(e.who);
              if (!m) return null;
              return (
                <div key={i} className="rounded-2xl border border-line bg-white p-4" style={{ borderLeftWidth: 3, borderLeftColor: m.dot }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: m.dot }} />
                    <span className="text-sm font-bold text-ink">{m.name}</span>
                    <span className="text-xs text-slate-400">{m.role}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{e.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
