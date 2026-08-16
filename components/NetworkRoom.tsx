"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; name: string };
type Step = "loading" | "name" | "advice" | "friends" | "done";

export default function NetworkRoom({ me, session }: { me: string; session: any }) {
  const supabase = createClient();
  const cohort = session.cohort || "__untagged__";
  const [step, setStep] = useState<Step>("loading");
  const [roster, setRoster] = useState<Person[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const loadRoster = async () => {
    const r = await fetch(`/api/network/roster?cohort=${encodeURIComponent(cohort)}`, {
      cache: "no-store",
    }).then((x) => x.json());
    setRoster(r.roster || []);
    return r.roster || [];
  };

  useEffect(() => {
    (async () => {
      await loadRoster();
      const { data } = await supabase
        .from("network_responses")
        .select("self_id, advice, friends")
        .eq("cohort", cohort)
        .eq("user_id", me)
        .maybeSingle();
      if (data) {
        setSelfId(data.self_id);
        setAdvice(new Set(data.advice || []));
        setFriends(new Set(data.friends || []));
      }
      setStep("name");
    })();
  }, []); // eslint-disable-line

  // Set my identity (pick existing OR add new) via one endpoint that prevents
  // duplicate/orphan roster entries.
  async function identify(payload: { pickId?: string; name?: string }) {
    const r = await fetch("/api/network/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort, ...payload }),
    }).then((x) => x.json());
    if (r.id) {
      setRoster(r.roster || []);
      setSelfId(r.id);
    }
  }

  async function submit() {
    setBusy(true);
    await fetch("/api/network/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cohort,
        selfId,
        advice: Array.from(advice),
        friends: Array.from(friends),
      }),
    });
    setBusy(false);
    setStep("done");
  }

  const selfName = roster.find((r) => r.id === selfId)?.name;

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
          ← Exit
        </Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The Network</span>
      </div>

      {step === "loading" && <div className="text-slate2">Loading…</div>}

      {step === "name" && (
        <div>
          <h1 className="text-2xl font-bold text-ink">Who are you?</h1>
          <p className="mt-1 text-slate2">Find your name, or add it if you&apos;re not listed.</p>
          <SelfPicker
            roster={roster}
            selfId={selfId}
            onPick={(id) => identify({ pickId: id })}
            onAdd={(name) => identify({ name })}
          />
          <StickyNext
            disabled={!selfId}
            label="Next"
            onClick={async () => {
              await loadRoster();
              setStep("advice");
            }}
          />
        </div>
      )}

      {step === "advice" && (
        <NominateStep
          title="Advice"
          question="Who have you gone to for career or program advice? Pick as many as you like."
          roster={roster}
          excludeId={selfId}
          selected={advice}
          onChange={setAdvice}
          onRefresh={loadRoster}
          onBack={() => setStep("name")}
          onNext={() => setStep("friends")}
        />
      )}

      {step === "friends" && (
        <NominateStep
          title="Friends"
          question="Who do you consider a personal friend? Pick as many as you like."
          roster={roster}
          excludeId={selfId}
          selected={friends}
          onChange={setFriends}
          onRefresh={loadRoster}
          onBack={() => setStep("advice")}
          onNext={submit}
          nextLabel={busy ? "Submitting…" : "Submit"}
        />
      )}

      {step === "done" && (
        <div className="card p-8 text-center">
          <div className="text-3xl">🕸️</div>
          <h1 className="mt-2 text-2xl font-bold text-ink">Thanks{selfName ? `, ${selfName}` : ""}!</h1>
          <p className="mt-2 text-slate2">
            Your answers are in. Watch the screen — the network is drawing itself.
          </p>
          <button onClick={() => setStep("advice")} className="btn-ghost mt-5">
            Edit my answers
          </button>
        </div>
      )}
    </main>
  );
}

function SelfPicker({
  roster,
  selfId,
  onPick,
  onAdd,
}: {
  roster: Person[];
  selfId: string | null;
  onPick: (id: string) => void;
  onAdd: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = roster.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  const exact = roster.some((r) => r.name.trim().toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="mt-4">
      <input
        className="field"
        placeholder="Type your name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="mt-3 max-h-[46vh] space-y-1.5 overflow-y-auto">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            className={
              "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition " +
              (selfId === r.id ? "border-sage bg-sage-soft" : "border-line hover:border-slate-300")
            }
          >
            <span className="text-ink">{r.name}</span>
            {selfId === r.id && <span className="text-sage">✓</span>}
          </button>
        ))}
        {q.trim() && !exact && (
          <button
            onClick={() => onAdd(q.trim())}
            className="w-full rounded-xl border border-dashed border-sage px-4 py-3 text-left text-sage"
          >
            ＋ Add &ldquo;{q.trim()}&rdquo; as my name
          </button>
        )}
      </div>
    </div>
  );
}

function NominateStep({
  title,
  question,
  roster,
  excludeId,
  selected,
  onChange,
  onRefresh,
  onBack,
  onNext,
  nextLabel = "Next",
}: {
  title: string;
  question: string;
  roster: Person[];
  excludeId: string | null;
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  onRefresh: () => Promise<any>;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [q, setQ] = useState("");
  const people = useMemo(() => roster.filter((r) => r.id !== excludeId), [roster, excludeId]);
  const filtered = people.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  }

  return (
    <div className="pb-24">
      <div className="text-xs font-semibold uppercase tracking-wide text-sage">{title}</div>
      <h1 className="mt-1 text-xl font-bold text-ink">{question}</h1>

      <div className="mt-3 flex items-center gap-2">
        <input
          className="field"
          placeholder={`Search ${people.length} names…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={onRefresh} title="Refresh list" className="btn-ghost">
          ↻
        </button>
      </div>
      <div className="mt-2 text-sm text-slate2">{selected.size} selected</div>

      <div className="mt-2 max-h-[52vh] space-y-1.5 overflow-y-auto">
        {filtered.map((r) => {
          const on = selected.has(r.id);
          return (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              className={
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition " +
                (on ? "border-sage bg-sage-soft" : "border-line hover:border-slate-300")
              }
            >
              <span className="text-ink">{r.name}</span>
              <span
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " +
                  (on ? "bg-sage text-white" : "bg-mist text-slate2")
                }
              >
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3">
          <button onClick={onBack} className="btn-ghost">
            Back
          </button>
          <button onClick={onNext} className="btn-primary">
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StickyNext({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg justify-end px-5 py-3">
        <button onClick={onClick} disabled={disabled} className="btn-primary">
          {label}
        </button>
      </div>
    </div>
  );
}
