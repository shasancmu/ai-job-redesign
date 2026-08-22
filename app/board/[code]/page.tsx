import { boardMember, type BoardEntry } from "@/lib/board";
import { loadOwnerReport } from "@/lib/reportPage";
import ReportShell from "@/components/ReportShell";
import BoardVerdict from "@/components/BoardVerdict";

export const dynamic = "force-dynamic";

export default async function BoardView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const decision: string = canvas.decision || "";
  const transcript: BoardEntry[] = canvas.transcript || [];
  const verdict = canvas.verdict;

  return (
    <ReportShell
      code={code}
      eyebrow="Your AI Board"
      title={decision || "Your decision"}
      backLabel="← Back to the board"
      shareTitle="An AI Board verdict"
      shareText="Here's what my AI Board decided, on Superadditive:"
      hasReport={!!verdict}
      emptyText="Your board hasn't reached a verdict yet."
      openLabel="Back to the board"
    >
      <BoardVerdict verdict={verdict} />

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
    </ReportShell>
  );
}
