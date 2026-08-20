"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";

type Person = { id: string; name: string };
type Step = "loading" | "name" | "advice" | "friends" | "done";

// Translate with a fallback to the passed-in English: if the key is missing,
// show the original rather than a key.
function tf(t: T, key: string, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

export default function NetworkRoom({ me, session, myName = "" }: { me: string; session: any; myName?: string }) {
  const supabase = createClient();
  const t = useT();
  const cohort = session.cohort || "__untagged__";
  const [step, setStep] = useState<Step>("loading");
  const [roster, setRoster] = useState<Person[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      } else if (myName.trim()) {
        // Logged in with a known name → put them in the roster automatically so
        // they never have to type it. They can still change it on this step.
        await identify({ name: myName.trim() });
      }
      setStep("name");
    })();
  }, []); // eslint-disable-line

  // Set my identity (pick existing OR add new) via one endpoint that prevents
  // duplicate/orphan roster entries.
  async function identify(payload: { pickId?: string; name?: string }) {
    setErr(null);
    try {
      const res = await fetch("/api/network/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort, ...payload }),
      });
      const r = await res.json().catch(() => ({}));
      if (res.ok && r.id) {
        setRoster(r.roster || []);
        setSelfId(r.id);
      } else {
        setErr(r.error === "service role not set" ? "The network isn't fully set up on the server (missing service role key)." : tf(t, "group.netSaveFailed", "Couldn't save your name. Try again."));
      }
    } catch {
      setErr(tf(t, "group.netSaveFailed", "Couldn't save your name. Try again."));
    }
  }

  async function removeMe() {
    if (!confirm(t("group.netRemoveConfirm"))) return;
    await fetch("/api/network/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort }),
    });
    setSelfId(null);
    setAdvice(new Set());
    setFriends(new Set());
    await loadRoster();
    setStep("name");
  }

  // Personal AI insight, fetched on the done screen.
  const [insight, setInsight] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (step !== "done") return;
    setInsight(undefined);
    fetch(`/api/network/insight?cohort=${encodeURIComponent(cohort)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setInsight(d.text || null))
      .catch(() => setInsight(null));
  }, [step, cohort]);

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
    <main className="mx-auto max-w-lg px-5 py-8 pb-28">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
          ← {t("room.exit")}
        </Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{t("group.netTag")}</span>
      </div>

      {step === "loading" && <div className="text-slate2">{t("group.netLoading")}</div>}

      {step === "name" && (
        <div>
          <h1 className="text-2xl font-bold text-ink">{t("group.netWhoAreYou")}</h1>
          <p className="mt-1 text-slate2">{t("group.netFindName")}</p>
          <SelfPicker
            roster={roster}
            selfId={selfId}
            initialName={selfId ? "" : myName}
            onPick={(id) => identify({ pickId: id })}
            onAdd={(name) => identify({ name })}
          />
          {err && <p className="mt-3 text-sm text-clay">{err}</p>}
          {selfId && (
            <button onClick={removeMe} className="mt-3 text-sm text-clay hover:underline">
              {t("group.netNotMeRestart")}
            </button>
          )}
          <StickyNext
            disabled={!selfId}
            label={t("group.next")}
            onClick={async () => {
              await loadRoster();
              setStep("advice");
            }}
          />
        </div>
      )}

      {step === "advice" && (
        <NominateStep
          title={t("group.netAdviceTitle")}
          question={t("group.netAdviceQ")}
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
          title={t("group.netFriendsTitle")}
          question={t("group.netFriendsQ")}
          roster={roster}
          excludeId={selfId}
          selected={friends}
          onChange={setFriends}
          onRefresh={loadRoster}
          onBack={() => setStep("advice")}
          onNext={submit}
          nextLabel={busy ? t("group.netSubmitting") : t("group.netSubmit")}
        />
      )}

      {step === "done" && (
        <div>
          <div className="card p-8 text-center">
            <div className="text-3xl">🕸️</div>
            <h1 className="mt-2 text-2xl font-bold text-ink">{t("group.netThanks")}{selfName ? `, ${selfName}` : ""}!</h1>
            <p className="mt-2 text-slate2">
              {t("group.netAnswersIn")}
            </p>
          </div>

          {insight === undefined && (
            <div className="mt-4 text-center text-sm text-slate2">{t("group.netReading")}</div>
          )}
          {typeof insight === "string" && (
            <div className="card mt-4 p-6">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">
                {t("group.netNutshell")}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-ink">{insight}</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button onClick={() => setStep("advice")} className="btn-ghost">
              {t("group.netEditAnswers")}
            </button>
            <button onClick={removeMe} className="text-sm text-clay hover:underline">
              {t("group.netNotMeRemove")}
            </button>
          </div>
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
  initialName = "",
}: {
  roster: Person[];
  selfId: string | null;
  onPick: (id: string) => void;
  onAdd: (name: string) => void;
  initialName?: string;
}) {
  const t = useT();
  const [q, setQ] = useState(initialName);
  const filtered = roster.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  const exact = roster.some((r) => r.name.trim().toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="mt-4">
      <input
        className="field"
        placeholder={t("group.netTypeName")}
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
            ＋ {t("group.netAddName", { name: q.trim() })}
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
  nextLabel,
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
  const t = useT();
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
          placeholder={t("group.netSearchNames", { n: people.length })}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={onRefresh} title={t("group.netRefresh")} className="btn-ghost">
          ↻
        </button>
      </div>
      <div className="mt-2 text-sm text-slate2">{t("group.netSelected", { n: selected.size })}</div>

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
            {t("room.back")}
          </button>
          <button onClick={onNext} className="btn-primary">
            {nextLabel ?? t("group.next")}
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
  const t = useT();
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
