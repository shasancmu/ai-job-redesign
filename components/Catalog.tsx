"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MODULES, PARTNER_META, formatPrice, type Partner } from "@/lib/modules";
import ModuleIcon from "@/components/ModuleIcon";

const ACCENT: Record<string, string> = {
  "reimagine-job": "bg-sage-soft text-sage",
  "reimagine-workflow": "bg-sky-soft text-sky",
  "solo-ai": "bg-amber-soft text-amber",
  benchmark: "bg-clay-soft text-clay",
  network: "bg-sky-soft text-sky",
};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const PAIRED = new Set(["job", "workflow"]);

// Where "View last result" should land: the printable artifact when there is one.
function resultHref(exercise: string, code: string) {
  if (exercise === "workflow" || exercise === "workflow-solo") return `/workflow-plan/${code}`;
  if (exercise === "solo") return `/plan/${code}`;
  if (["gas", "ocfit", "experiment", "four-a", "scorecard", "venture"].includes(exercise)) return `/canvas/${code}`;
  if (exercise === "career-xray" || exercise === "jd-xray") return `/career/${code}`;
  return `/room/${code}`;
}

export default function Catalog({
  userId,
  unlocked,
  initialCohort = "",
  moduleSlugs,
  fixedCohort,
  completed = {},
  lastCode = {},
}: {
  userId: string;
  unlocked: Record<string, boolean>;
  initialCohort?: string;
  moduleSlugs?: string[];
  fixedCohort?: string;
  completed?: Record<string, boolean>;
  lastCode?: Record<string, string>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const cohort = fixedCohort ?? initialCohort;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const shown = moduleSlugs
    ? (moduleSlugs.map((s) => MODULES.find((m) => m.slug === s)).filter(Boolean) as typeof MODULES)
    : MODULES;

  // Single-user modules (solo, benchmark, network) start immediately.
  async function startSolo(slug: string, exercise: string) {
    setErr(null);
    // In-class activities (benchmark, network) are cohort-scoped — without a
    // cohort they'd aggregate into one unbounded, global bucket.
    if ((exercise === "network" || exercise === "benchmark") && !cohort) {
      setErr("This runs in a cohort — open your facilitator's cohort link to take part.");
      return;
    }
    setBusy(slug);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      const { data, error } = await supabase
        .from("sessions")
        .insert({ code, host_id: userId, status: "active", cohort: cohort || null, exercise })
        .select()
        .single();
      if (!error && data) {
        router.push(`/room/${code}`);
        return;
      }
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
        setErr(error.message);
        setBusy(null);
        return;
      }
    }
    setErr("Couldn't start — try again.");
    setBusy(null);
  }

  const renderCard = (m: (typeof MODULES)[number]) => {
    const open = !!unlocked[m.slug];
    const chip = ACCENT[m.slug] || "bg-sage-soft text-sage";
    const paired = PAIRED.has(m.exercise);
    const pm = PARTNER_META[m.partner];
    return (
            <div key={m.slug} className="card flex flex-col p-6 transition hover:shadow-lift">
              <div className={"flex h-11 w-11 items-center justify-center rounded-xl " + chip}>
                <ModuleIcon slug={m.slug} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{m.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate2">{m.tagline}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/45">
                <span className={"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium " + pm.chip}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
                  {pm.label}
                </span>
                <span>{m.minutes} min</span>
                {m.instructorTool && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-ink/55">Instructor tool</span>
                )}
                {completed[m.slug] && (
                  <span className="rounded-full bg-sage-soft px-2 py-0.5 font-medium text-sage">✓ Done</span>
                )}
              </div>

              {!open ? (
                <Link href={`/paywall?module=${m.slug}`} className="btn-dark mt-5">
                  Unlock — {formatPrice(m.priceCents)}
                </Link>
              ) : m.partner === "group" && !cohort ? (
                <div className="mt-5 rounded-lg bg-mist px-3 py-2.5 text-xs leading-relaxed text-slate2">
                  Runs live in a cohort. Open your facilitator&apos;s cohort link to take part.
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {paired ? (
                    <Link
                      href={`/pair/${m.slug}${cohort ? `?cohort=${encodeURIComponent(cohort)}` : ""}`}
                      className="btn-primary w-full"
                    >
                      {completed[m.slug] ? "Do it again" : "Pair up →"}
                    </Link>
                  ) : (
                    <button
                      onClick={() => startSolo(m.slug, m.exercise)}
                      disabled={busy === m.slug}
                      className="btn-primary w-full"
                    >
                      {busy === m.slug ? "Starting…" : completed[m.slug] ? "Do it again" : "Start"}
                    </button>
                  )}
                  {completed[m.slug] && lastCode[m.slug] && (
                    <Link
                      href={resultHref(m.exercise, lastCode[m.slug])}
                      className="block text-center text-sm text-slate2 hover:text-ink"
                    >
                      View last result →
                    </Link>
                  )}
                </div>
              )}
            </div>
    );
  };

  // On the class view (moduleSlugs given) keep the curated order flat.
  // On the main dashboard, group by who you do it with.
  const SECTIONS: { partner: Partner; title: string; sub: string }[] = [
    { partner: "human", title: "With a partner", sub: "Live, two people in a breakout room" },
    { partner: "ai", title: "With AI", sub: "Solo — an AI plays your partner" },
    { partner: "group", title: "In class", sub: "Live, large-group activities" },
  ];
  const grouped = !moduleSlugs;
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div>
      {err && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {!grouped ? (
        <div className={grid}>{shown.map(renderCard)}</div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map(({ partner, title, sub }) => {
            const mods = shown.filter((m) => m.partner === partner);
            if (mods.length === 0) return null;
            return (
              <div key={partner}>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h3 className="text-sm font-bold text-ink">{title}</h3>
                  <span className="text-xs text-slate2">{sub}</span>
                </div>
                <div className={grid}>{mods.map(renderCard)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
