"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MODULES, PARTNER_META, CATEGORIES, moduleCategory, formatPrice, modulePills, pillLabel, moduleMatches, hasActiveFilters, byCatalogOrder } from "@/lib/modules";
import ModuleIcon from "@/components/ModuleIcon";
import ModuleFilters from "@/components/ModuleFilters";
import FeatureBadges from "@/components/FeatureBadges";
import { useT } from "@/components/I18nProvider";

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
  if (["gas", "ocfit", "experiment", "four-a", "scorecard", "venture", "deeptech"].includes(exercise)) return `/canvas/${code}`;
  if (exercise === "career-xray" || exercise === "jd-xray") return `/career/${code}`;
  if (exercise === "career-roadmap") return `/roadmap/${code}`;
  if (exercise === "consult" || exercise === "voice-consult") return `/consult/${code}`;
  if (exercise === "vision" || exercise === "vision-voice") return `/vision/${code}`;
  if (exercise === "superpower") return `/superpower/${code}`;
  if (exercise === "personal-network") return `/network-map/${code}`;
  if (exercise === "domain-brief") return `/domain-brief/${code}`;
  if (exercise === "collaborators") return `/collaborators/${code}`;
  if (exercise === "licensing-brief") return `/licensing/${code}`;
  if (exercise === "board") return `/board/${code}`;
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
  recommended = [],
  runsLeft = {},
}: {
  userId: string;
  unlocked: Record<string, boolean>;
  initialCohort?: string;
  moduleSlugs?: string[];
  fixedCohort?: string;
  completed?: Record<string, boolean>;
  lastCode?: Record<string, string>;
  recommended?: string[];
  runsLeft?: Record<string, number | null>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  // Translate with a graceful fallback: if a key isn't in the locale (or in the
  // English base), show the registry's own string rather than a raw key.
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const cohort = fixedCohort ?? initialCohort;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null); // slug of the module whose "What's this?" is open
  const [query, setQuery] = useState("");
  const [activePills, setActivePills] = useState<Set<string>>(new Set());
  const [activeFeatures, setActiveFeatures] = useState<Set<string>>(new Set());
  const toggleIn = (set: (fn: (s: Set<string>) => Set<string>) => void) => (k: string) =>
    set((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  const togglePill = toggleIn(setActivePills);
  const toggleFeature = toggleIn(setActiveFeatures);
  const clearFilters = () => { setQuery(""); setActivePills(new Set()); setActiveFeatures(new Set()); };
  const shown = moduleSlugs
    ? (moduleSlugs.map((s) => MODULES.find((m) => m.slug === s)).filter(Boolean) as typeof MODULES)
    : MODULES.filter((m) => !m.hidden);

  // Single-user modules (solo, benchmark, network) start immediately.
  async function startSolo(slug: string, exercise: string) {
    setErr(null);
    // In-class activities (benchmark, network) are cohort-scoped — without a
    // cohort they'd aggregate into one unbounded, global bucket.
    if ((exercise === "network" || exercise === "benchmark") && !cohort) {
      setErr("This runs in a cohort. Open your facilitator's cohort link to take part.");
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
    setErr("Couldn't start. Try again.");
    setBusy(null);
  }

  const renderCard = (m: (typeof MODULES)[number]) => {
    const open = !!unlocked[m.slug];
    const chip = ACCENT[m.slug] || "bg-sage-soft text-sage";
    const paired = PAIRED.has(m.exercise);
    const pm = PARTNER_META[m.partner];
    const left = runsLeft[m.slug]; // null = unlimited, number = runs remaining
    const out = left === 0; // no runs remaining → send to the paywall
    const canStart = open && !out;
    return (
            <div key={m.slug} className="card relative flex flex-col p-6 transition hover:shadow-lift">
              <button
                type="button"
                onClick={() => setDetail(m.slug)}
                aria-label={`What's ${m.name}?`}
                title="See what this exercise is, its themes, and how to start"
                className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-mist hover:text-ink"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </button>
              <div className={"flex h-11 w-11 items-center justify-center rounded-xl " + chip}>
                <ModuleIcon slug={m.slug} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{tf("modules." + m.slug + ".name", m.name)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate2">{tf("modules." + m.slug + ".tagline", m.tagline)}</p>
              <div className="mt-2 flex flex-1 flex-wrap content-start gap-1">
                {modulePills(m.slug).map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePill(p)}
                    className={
                      "rounded px-1.5 py-0.5 text-[10px] font-medium transition " +
                      (activePills.has(p) ? "bg-ink text-white" : "bg-mist text-slate-500 hover:bg-slate-200")
                    }
                  >
                    {pillLabel(p)}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/45">
                <span className={"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium " + pm.chip}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
                  {tf("partner." + m.partner, pm.label)}
                </span>
                <span>{t("catalog.min", { n: m.minutes })}</span>
                <FeatureBadges slug={m.slug} />
                {completed[m.slug] && (
                  <span className="rounded-full bg-sage-soft px-2 py-0.5 font-medium text-sage">{t("catalog.done")}</span>
                )}
                {typeof left === "number" && (
                  <span className={"rounded-full px-2 py-0.5 font-medium " + (out ? "bg-clay-soft text-clay" : "bg-mist text-slate2")}>
                    {out ? "No runs left" : `${left} run${left === 1 ? "" : "s"} left`}
                  </span>
                )}
              </div>

              {!canStart ? (
                <Link
                  href={`/paywall?module=${m.slug}`}
                  title={out && open ? "Buy more runs for this exercise" : "Unlock this exercise to start"}
                  className="btn-dark mt-5"
                >
                  {out && open ? "Get more runs" : t("catalog.unlock")}
                </Link>
              ) : m.partner === "group" && !cohort ? (
                <div className="mt-5 rounded-lg bg-mist px-3 py-2.5 text-xs leading-relaxed text-slate2">
                  {t("catalog.cohortOnly")}
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {paired ? (
                    <Link
                      href={`/pair/${m.slug}${cohort ? `?cohort=${encodeURIComponent(cohort)}` : ""}`}
                      title={completed[m.slug] ? "Run this again with a partner over a shared link" : "Start with a partner over a shared link"}
                      className="btn-primary w-full"
                    >
                      {completed[m.slug] ? t("catalog.doItAgain") : t("catalog.pairUp")}
                    </Link>
                  ) : (
                    <button
                      onClick={() => startSolo(m.slug, m.exercise)}
                      disabled={busy === m.slug}
                      title={completed[m.slug] ? "Run this exercise again" : "Start this exercise now"}
                      className="btn-primary w-full"
                    >
                      {busy === m.slug ? t("catalog.starting") : completed[m.slug] ? t("catalog.doItAgain") : t("catalog.start")}
                    </button>
                  )}
                  {completed[m.slug] && lastCode[m.slug] && (
                    <Link
                      href={resultHref(m.exercise, lastCode[m.slug])}
                      title="Reopen your saved report"
                      className="block text-center text-sm text-slate2 hover:text-ink"
                    >
                      {t("catalog.viewLast")}
                    </Link>
                  )}
                </div>
              )}
            </div>
    );
  };

  // On the class view (moduleSlugs given) keep the curated order flat.
  // On the main dashboard, group by TOPIC.
  const grouped = !moduleSlugs;
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  // "Recommended for you" — resolve the segment/goal slugs to modules, in order.
  const recModules = grouped
    ? (recommended.map((s) => MODULES.find((m) => m.slug === s)).filter((m) => m && !m.hidden) as typeof MODULES)
    : [];

  return (
    <div>
      {err && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {!grouped ? (
        <div className={grid}>{shown.map(renderCard)}</div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const filterState = { query, topics: activePills, features: activeFeatures };
            const filtering = hasActiveFilters(filterState);
            const mods = (filtering ? shown.filter((m) => moduleMatches(m, filterState)) : shown).slice().sort(byCatalogOrder);
            return (
              <>
                <ModuleFilters
                  query={query}
                  onQuery={setQuery}
                  topics={activePills}
                  onToggleTopic={togglePill}
                  features={activeFeatures}
                  onToggleFeature={toggleFeature}
                  onClear={clearFilters}
                  modules={shown}
                  resultCount={filtering ? mods.length : undefined}
                />

                {filtering ? (
                  mods.length ? (
                    <div className={grid}>{mods.map(renderCard)}</div>
                  ) : (
                    <p className="text-sm text-slate2">No exercises match. Try clearing a filter or your search.</p>
                  )
                ) : (
            <>
              {recModules.length > 0 && (
                <div>
                  <div className="mb-3 flex items-baseline gap-2">
                    <span className="h-2 w-2 rounded-full bg-ink" />
                    <h3 className="text-sm font-bold text-ink">{t("dash.recommended")}</h3>
                  </div>
                  <div className={grid}>{recModules.map(renderCard)}</div>
                </div>
              )}
              {CATEGORIES.map((cat) => {
                const mods = shown.filter((m) => moduleCategory(m.slug) === cat.key).sort(byCatalogOrder);
                if (mods.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: cat.dot }} />
                      <h3 className="text-sm font-bold text-ink">{t("cat." + cat.key)}</h3>
                    </div>
                    <div className={grid}>{mods.map(renderCard)}</div>
                  </div>
                );
              })}
                    </>
                  )}
                </>
              );
            })()}
        </div>
      )}

      {/* "What's this?" module detail — what the exercise is, its features, and how to start it. */}
      {(() => {
        const m = detail ? MODULES.find((x) => x.slug === detail) : null;
        if (!m) return null;
        const pm = PARTNER_META[m.partner];
        const open = !!unlocked[m.slug];
        const left = runsLeft[m.slug];
        const out = left === 0;
        const canStart = open && !out;
        const paired = PAIRED.has(m.exercise);
        const close = () => setDetail(null);
        if (typeof document === "undefined") return null;
        return createPortal(
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal onClick={close}>
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " + (ACCENT[m.slug] || "bg-sage-soft text-sage")}>
                  <ModuleIcon slug={m.slug} />
                </div>
                <button onClick={close} aria-label="Close" className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-mist hover:text-ink">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>

              <h3 className="mt-3 text-xl font-bold text-ink">{tf("modules." + m.slug + ".name", m.name)}</h3>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink/45">
                <span className={"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium " + pm.chip}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
                  {tf("partner." + m.partner, pm.label)}
                </span>
                <span>{t("catalog.min", { n: m.minutes })}</span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">{m.description}</p>

              {modulePills(m.slug).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {modulePills(m.slug).map((p) => (
                    <span key={p} className="rounded bg-mist px-2 py-0.5 text-[11px] font-medium text-slate-500">{pillLabel(p)}</span>
                  ))}
                </div>
              )}

              <div className="mt-6">
                {!canStart ? (
                  <Link href={`/paywall?module=${m.slug}`} className="btn-dark w-full">
                    {out && open ? "Get more runs" : t("catalog.unlock")}
                  </Link>
                ) : m.partner === "group" && !cohort ? (
                  <div className="rounded-lg bg-mist px-3 py-2.5 text-center text-xs leading-relaxed text-slate2">{t("catalog.cohortOnly")}</div>
                ) : paired ? (
                  <Link
                    href={`/pair/${m.slug}${cohort ? `?cohort=${encodeURIComponent(cohort)}` : ""}`}
                    className="btn-primary w-full"
                  >
                    {completed[m.slug] ? t("catalog.doItAgain") : t("catalog.pairUp")}
                  </Link>
                ) : (
                  <button
                    onClick={() => { close(); startSolo(m.slug, m.exercise); }}
                    disabled={busy === m.slug}
                    className="btn-primary w-full"
                  >
                    {completed[m.slug] ? t("catalog.doItAgain") : t("catalog.start")}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
