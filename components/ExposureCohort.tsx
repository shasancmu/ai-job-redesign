"use client";

// Cohort research view for the X-ray modules:
//  1. Predicted (top-down, occupation) vs. actual (bottom-up, their tasks)
//     exposure — the "models say X, the room said Y" scatter.
//  2. Theme prevalence — a transparent LEXICAL bucketing of the room's tasks
//     (an in-app approximation of structural topic modeling; the CSV export
//     lets you run rigorous STM offline).

type Task = { task: string; exposure: string; mode?: string };
export type XrayRow = { name: string; role: string; topDown: number; bottomUp: number; exercise: string; tasks: Task[] };

const THEMES: { key: string; label: string; kw: string[] }[] = [
  { key: "writing", label: "Writing & content", kw: ["write", "draft", "copy", "content", "email", "communicat", "document", "edit"] },
  { key: "analysis", label: "Analysis & reporting", kw: ["report", "analy", "data", "dashboard", "metric", "forecast", "model", "research", "summar", "query", "sql"] },
  { key: "coordination", label: "Coordination & stakeholders", kw: ["align", "coordinat", "meeting", "stakeholder", "cross-functional", "collaborat", "present", "manage the", "vendor", "agency"] },
  { key: "strategy", label: "Strategy & judgment", kw: ["strateg", "decision", "prioriti", "judgment", "vision", "position", "roadmap", "plan"] },
  { key: "ops", label: "Operations & admin", kw: ["schedul", "process", "admin", "operations", "logistics", "complianc", "invoice", "setup", "maintain", "provision"] },
  { key: "technical", label: "Technical & build", kw: ["code", "engineer", "develop", "build", "deploy", "design", "architect", "integrat"] },
  { key: "customer", label: "Customer & relationships", kw: ["customer", "client", "relationship", "sales", "account", "support", "retention", "onboard"] },
];

function classify(t: string): string {
  const s = t.toLowerCase();
  for (const th of THEMES) if (th.kw.some((k) => s.includes(k))) return th.key;
  return "other";
}
const expScore = (e: string) => (e === "E2" ? 100 : e === "E1" ? 50 : 0);

export default function ExposureCohort({ rows, cohort }: { rows: XrayRow[]; cohort: string }) {
  if (!rows.length) return null;

  // theme aggregation
  const themeAgg: Record<string, { n: number; sum: number }> = {};
  let totalTasks = 0;
  for (const r of rows) for (const t of r.tasks) {
    const k = classify(t.task);
    themeAgg[k] = themeAgg[k] || { n: 0, sum: 0 };
    themeAgg[k].n += 1;
    themeAgg[k].sum += expScore(t.exposure);
    totalTasks += 1;
  }
  const themeList = [...THEMES, { key: "other", label: "Other", kw: [] }]
    .map((th) => ({ label: th.label, n: themeAgg[th.key]?.n || 0, avg: themeAgg[th.key]?.n ? Math.round(themeAgg[th.key].sum / themeAgg[th.key].n) : 0 }))
    .filter((t) => t.n > 0)
    .sort((a, b) => b.n - a.n);

  const avgTop = Math.round(rows.reduce((s, r) => s + r.topDown, 0) / rows.length);
  const avgBot = Math.round(rows.reduce((s, r) => s + r.bottomUp, 0) / rows.length);

  // scatter geometry
  const L = 48, R = 320, T = 16, B = 244, W = 272, H = 228;
  const sx = (v: number) => L + (Math.max(0, Math.min(100, v)) / 100) * W;
  const sy = (v: number) => B - (Math.max(0, Math.min(100, v)) / 100) * H;

  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-bold text-ink">Exposure — the room</div>
        <a href={`/facilitator/career-export?cohort=${encodeURIComponent(cohort)}`} className="text-sm font-medium text-sage hover:underline">↓ Task data (CSV, for STM)</a>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {/* predicted vs actual scatter */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Predicted vs. actual exposure</div>
          <svg viewBox="0 0 340 280" className="mt-2 w-full" role="img" aria-label="Predicted vs actual exposure scatter">
            <line x1={sx(0)} y1={sy(0)} x2={sx(100)} y2={sy(100)} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={sx(78)} y={sy(78) - 5} fontSize="9" fill="#94a3b8" fontStyle="italic">predicted = actual</text>
            <line x1={L} y1={T} x2={L} y2={B} stroke="#cbd5e1" strokeWidth="1" />
            <line x1={L} y1={B} x2={R} y2={B} stroke="#cbd5e1" strokeWidth="1" />
            {rows.map((r, i) => (
              <circle key={i} cx={sx(r.bottomUp)} cy={sy(r.topDown)} r="5" fill="#CE8F2C" fillOpacity={0.75} stroke="#fff" strokeWidth="1.5" />
            ))}
            <circle cx={sx(avgBot)} cy={sy(avgTop)} r="7" fill="#14283A" stroke="#fff" strokeWidth="2" />
            <text x={(L + R) / 2} y={272} textAnchor="middle" fontSize="11" fill="#64748b">Actual (their tasks) →</text>
            <text x={14} y={(T + B) / 2} textAnchor="middle" fontSize="11" fill="#64748b" transform={`rotate(-90 14 ${(T + B) / 2})`}>Predicted (occupation) →</text>
          </svg>
          <p className="text-xs text-slate-400">{rows.length} people · room avg {avgBot}% actual vs {avgTop}% predicted (dark dot). Above the line = the occupation looks more exposed than their real tasks (they've moved up-market); below = the reverse.</p>
        </div>

        {/* theme prevalence */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">What the room's work is made of</div>
          <div className="mt-3 space-y-2">
            {themeList.map((t) => (
              <div key={t.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{t.label}</span>
                  <span className="text-xs text-slate-400">{t.n} tasks · {t.avg}% avg exposure</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((t.n / totalTasks) * 100)}%`, background: t.avg >= 66 ? "#B4532E" : t.avg >= 33 ? "#CE8F2C" : "#3F7A52" }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Bar length = share of tasks; color = average AI exposure. Lexical buckets — a rough approximation of STM. Export the tasks to model themes rigorously.</p>
        </div>
      </div>
    </div>
  );
}
