import Link from "next/link";

// One place to launch anything live for a cohort — full-cohort exercises, quick
// room activities, or driving an assigned exercise. Cohort-scoped hosts get the
// cohort passed so results roll up; ad-hoc room activities run on their own code.
type Act = { name: string; emoji: string; blurb: string; href: string; cohortAware?: boolean };

const FULL_COHORT: Act[] = [
  { name: "The Number", emoji: "📉", blurb: "Team capstone — every team races to one number, on a live board.", href: "/facilitator/capstone" },
  { name: "The Network", emoji: "🕸️", blurb: "Map the room's real network, live and anonymous.", href: "/facilitator/network", cohortAware: true },
  { name: "The Benchmark", emoji: "⏱️", blurb: "A timed test — the room vs. the machine, scored live.", href: "/facilitator/benchmark", cohortAware: true },
];
const ROOM: Act[] = [
  { name: "Live word cloud", emoji: "🌥️", blurb: "Ask a question; answers build into a cloud. No sign-in.", href: "/facilitator/cloud" },
  { name: "Photo wall", emoji: "📷", blurb: "The room photographs something; AI reads each.", href: "/facilitator/photo" },
  { name: "Open floor", emoji: "💬", blurb: "A big group chat; AI reads and adjudicates the room live.", href: "/facilitator/forum" },
  { name: "Showcase", emoji: "🎤", blurb: "Back-to-back presentations; feedback and an AI report each.", href: "/facilitator/showcase" },
];
const COCKPIT: Act[] = [
  { name: "Live cockpit", emoji: "🎛️", blurb: "Drive an assigned exercise for the room, step by step.", href: "/facilitator/live", cohortAware: true },
  { name: "Live aggregate", emoji: "📊", blurb: "Project answers aggregating live on screen.", href: "/facilitator/aggregate", cohortAware: true },
];

function link(a: Act, cohort?: string) {
  return a.cohortAware && cohort ? `${a.href}?cohort=${encodeURIComponent(cohort)}` : a.href;
}

function Grid({ items, cohort }: { items: Act[]; cohort?: string }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {items.map((a) => (
        <Link key={a.name} href={link(a, cohort)} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition hover:shadow-sm">
          <span className="text-2xl">{a.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink group-hover:text-sage">{a.name}</div>
            <div className="truncate text-xs text-slate-400">{a.blurb}</div>
          </div>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
      ))}
    </div>
  );
}

export default function LiveLauncher({ cohort, authored = [] }: { cohort?: string; authored?: { slug: string; name: string; emoji?: string }[] }) {
  const mine: Act[] = authored.map((a) => ({ name: a.name, emoji: a.emoji || "🌥️", blurb: "Your live prompt — the room answers, live.", href: `/lp/${a.slug}`, cohortAware: true }));
  return (
    <div className="space-y-5">
      {mine.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your live templates</div>
          <Grid items={mine} cohort={cohort} />
        </div>
      )}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Full-cohort exercises</div>
        <Grid items={FULL_COHORT} cohort={cohort} />
      </div>
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quick room activities</div>
        <Grid items={ROOM} cohort={cohort} />
      </div>
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Drive an assigned exercise</div>
        <Grid items={COCKPIT} cohort={cohort} />
      </div>
    </div>
  );
}
