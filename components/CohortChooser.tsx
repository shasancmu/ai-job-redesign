import Link from "next/link";

// Shown when a cohort live activity is launched without a cohort selected: pick
// which cohort to run it for.
export default function CohortChooser({
  title,
  basePath,
  cohorts,
}: {
  title: string;
  basePath: string;
  cohorts: { code: string; name: string }[];
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Facilitator</Link>
      <h1 className="mt-1 text-3xl text-ink">{title}</h1>
      <p className="mt-1 text-slate2">Pick a cohort to run this live for.</p>

      {cohorts.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <div className="text-slate-600">No cohorts yet.</div>
          <Link href="/facilitator/classes" className="btn-primary mt-4 inline-block text-sm">Create a cohort</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {cohorts.map((c) => (
            <li key={c.code}>
              <Link href={`${basePath}?cohort=${encodeURIComponent(c.code)}`} className="card group flex items-center justify-between p-5 transition hover:shadow-lift">
                <div>
                  <div className="font-mono text-lg font-bold text-ink">{c.code}</div>
                  {c.name && <div className="text-sm text-slate2">{c.name}</div>}
                </div>
                <span className="text-slate-300 transition group-hover:text-ink">Present →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
