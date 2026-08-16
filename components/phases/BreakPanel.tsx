"use client";

export default function BreakPanel(props: any) {
  const { myWorkspace, partnerProfile } = props;
  const partnerName = partnerProfile?.display_name || "your partner";
  const notes = myWorkspace?.interview_notes;

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
      <div className="rounded-2xl bg-mist p-8">
        <div className="text-4xl">✋</div>
        <h2 className="mt-3 text-xl font-bold text-ink">Pause — back to the room</h2>
        <p className="mt-2 text-slate2">
          Your instructor is about to teach the <b className="text-ink">2×4 AI × Human model</b>. Watch
          the screen. When they say go, tap <b className="text-ink">Next</b> and you&apos;ll redesign{" "}
          {partnerName}&apos;s job with what you learned.
        </p>
      </div>

      {notes && (
        <div className="card p-5 text-left">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">
            Your notes on {partnerName} (you&apos;ll use these next)
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate2">{notes}</p>
        </div>
      )}
    </div>
  );
}
