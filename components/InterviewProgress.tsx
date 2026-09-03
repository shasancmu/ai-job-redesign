"use client";

type Msg = { role: "user" | "assistant"; content: string };

// How far through an AI interview you are.
//
// Every one of these interviews is held to a turn budget in lib/ai.ts — past it
// the interviewer is replaced by a closing prompt rather than asked to restrain
// itself. But the learner couldn't see that budget: an open-ended chat with no
// visible end is why people stall, because there is no way to tell a third of
// the way through from nearly done. SoloRoom grew a marker for exactly this
// reason and it stayed there alone; this is that marker, shared.
export default function InterviewProgress({
  msgs,
  turns = 6,
  doneNote,
}: {
  msgs: Msg[];
  turns?: number; // must match the budget lib/ai.ts enforces for this interview
  doneNote?: string; // what happens next, when the room has something specific to say
}) {
  const asked = msgs.filter((m) => m.role === "user").length;
  const done = asked >= turns;

  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: turns }).map((_, i) => (
          <span key={i} className={"h-1 w-4 rounded-full " + (i < asked ? "bg-ai" : "bg-slate-200")} />
        ))}
      </span>
      <span>
        {done
          ? doneNote || "That's everything it needs — you can move on whenever you're ready."
          : `Question ${Math.min(asked + 1, turns)} of about ${turns}`}
      </span>
    </div>
  );
}
