// Modern / minimal certificate card. Server-renderable (no client hooks) so it
// works on the achievements wall (compact, linked) and the public verify page
// (full). Restraint is the point: thin rule, a small monogram, typography.

function Monogram({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg font-bold text-white"
      style={{ width: size, height: size, background: "#3F7A52", fontSize: size * 0.5 }}
      aria-hidden
    >
      S
    </span>
  );
}

export default function CredentialCard({
  eyebrow,
  title,
  line,
  holder,
  dateLabel,
  variant = "wall",
  contents,
  skills,
  credId,
}: {
  eyebrow: string;
  title: string;
  line: string;
  holder?: string;
  dateLabel?: string;
  variant?: "wall" | "full";
  contents?: { name: string }[];
  skills?: string[];
  credId?: string;
}) {
  const full = variant === "full";
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-line bg-white"
      style={{ boxShadow: full ? "0 1px 2px rgba(20,40,58,.04)" : undefined }}
    >
      <div className="h-1 w-full" style={{ background: "#3F7A52" }} />
      <div className={full ? "p-8 sm:p-10" : "p-5"}>
        <div className="flex items-center gap-2">
          <Monogram size={full ? 30 : 24} />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "#3F7A52" }}
          >
            {eyebrow}
          </span>
        </div>

        <h3
          className={
            full
              ? "mt-5 text-3xl font-bold leading-tight text-ink sm:text-4xl"
              : "mt-3 text-lg font-bold leading-snug text-ink"
          }
        >
          {title}
        </h3>
        <p className={full ? "mt-3 text-base text-slate-600" : "mt-1.5 text-sm text-slate-500"}>
          {line}
        </p>

        {full && skills && skills.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-line bg-mist/60 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {full && contents && contents.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Earned by completing
            </div>
            <ul className="mt-2 space-y-1.5">
              {contents.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path
                      d="M5 10.5l3.2 3.2L15 7"
                      stroke="#3F7A52"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={
            "mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4 " +
            (full ? "text-sm" : "text-xs")
          }
        >
          {holder && (
            <span className="text-slate-600">
              Issued to <span className="font-semibold text-ink">{holder}</span>
            </span>
          )}
          {dateLabel && <span className="text-slate-400">{dateLabel}</span>}
          <span className="ml-auto inline-flex items-center gap-1.5 text-slate-400">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M5 10.5l3.2 3.2L15 7"
                stroke="#3F7A52"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Verified · Superadditive
          </span>
        </div>

        {full && credId && (
          <div className="mt-3 font-mono text-[11px] text-slate-300">
            Credential ID {credId}
          </div>
        )}
      </div>
    </div>
  );
}
