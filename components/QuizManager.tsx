"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { makeQuizCode } from "@/lib/quiz";

type Sess = { id: string; code: string; status: string; created_at: string };

const STATUS_CHIP: Record<string, string> = {
  open: "bg-sky-soft text-sky",
  revealed: "bg-sage-soft text-sage",
  closed: "bg-slate-100 text-slate-600",
};

export default function QuizManager({ me, initial, ready }: { me: string; initial: Sess[]; ready: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [list, setList] = useState<Sess[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeQuizCode();
      const { data, error } = await supabase
        .from("quiz_sessions")
        .insert({ code, host_id: me, status: "open" })
        .select()
        .single();
      if (!error && data) {
        router.push(`/quiz/${code}/present`);
        return;
      }
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
        setErr(error.message);
        setBusy(false);
        return;
      }
    }
    setErr("Couldn't create. Try again.");
    setBusy(false);
  }

  async function remove(id: string, code: string) {
    if (!window.confirm(`Delete quiz ${code}? This removes it and all its submissions.`)) return;
    const { error } = await supabase.from("quiz_sessions").delete().eq("id", id);
    if (!error) setList((l) => l.filter((c) => c.id !== id));
    else window.alert(error.message);
  }

  return (
    <div className="space-y-8">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <div className="font-bold text-ink">Start a live quiz</div>
          <div className="text-sm text-slate2">Creates a code + QR. The room joins and takes it, no sign-in.</div>
        </div>
        <button onClick={create} disabled={busy} className="btn-primary" title={ready ? "" : "Set up questions first"}>
          {busy ? "Creating…" : "Create & present →"}
        </button>
      </div>
      {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      <div>
        <h2 className="eyebrow mb-3">Your quizzes</h2>
        {list.length === 0 ? (
          <p className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">None yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="card flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-widest text-ink">{c.code}</span>
                  <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (STATUS_CHIP[c.status] || "bg-slate-100 text-slate-600")}>{c.status}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/quiz/${c.code}/present`} className="btn-primary text-sm">Present</Link>
                  <button
                    onClick={() => remove(c.id, c.code)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
