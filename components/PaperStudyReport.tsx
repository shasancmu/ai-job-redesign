// Understand a Paper: the AI's deconstruction of a paper through the four
// research frameworks. Plain component, used in the room and the shared page.
export default function PaperStudyReport({ study }: { study: any }) {
  if (!study) return null;
  const idea = study.idea || {};
  const h = study.hourglass || {};
  const points: string[] = Array.isArray(study.points) ? study.points : [];
  const it = study.interaction || {};
  const hourglass = [
    { k: "Motivation", v: h.motivation },
    { k: "Problem", v: h.problem },
    { k: "Approach", v: h.approach },
    { k: "Findings", v: h.findings },
    { k: "Contribution", v: h.contribution },
  ].filter((x) => x.v);

  return (
    <div className="space-y-5">
      <div data-guide="headline" className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The paper</div>
        {study.title && <h2 className="mt-1 text-xl font-bold leading-snug text-ink">{study.title}</h2>}
        {study.takeaway && <p className="mt-2 text-sm leading-relaxed text-slate-600">{study.takeaway}</p>}
      </div>

      <Section anchor="idea" eyebrow="The idea" accent="#3F7A52">
        {idea.invisibleForce && (
          <Row label="The invisible force it makes visible">{idea.invisibleForce}</Row>
        )}
        {idea.kind && <Row label="Kind of idea">{cap(idea.kind)}</Row>}
        {idea.insight && (
          <div className="mt-3 rounded-xl bg-sage-soft p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">The insight, in one sentence</div>
            <p className="mt-1 text-sm font-medium text-ink">{idea.insight}</p>
          </div>
        )}
      </Section>

      {hourglass.length > 0 && (
        <Section anchor="hourglass" eyebrow="The hourglass" accent="#B07A1E">
          <ol className="space-y-2.5">
            {hourglass.map((x, i) => (
              <li key={x.k} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-mist text-[11px] font-bold text-slate-500">{i + 1}</span>
                <div className="text-sm text-slate-700"><span className="font-semibold text-ink">{x.k}. </span>{x.v}</div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {points.length > 0 && (
        <Section anchor="points" eyebrow="The five points" accent="#7C5CBF">
          <ul className="space-y-2">
            {points.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: "#7C5CBF" }} />
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section anchor="interaction" eyebrow="The key interaction" accent="#14283A">
        {it.hasInteraction ? (
          <>
            <p className="font-mono text-xs text-slate-400">Y = b0 + b1·X1 + b2·X2 + b3·(X1 × X2)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Chip label="Y" value={it.y} />
              <Chip label="X1" value={it.x1} />
              <Chip label="X2" value={it.x2} />
            </div>
            <p className="mt-3 text-sm text-slate-700">
              The effect of <b>{it.x1 || "X1"}</b> on <b>{it.y || "Y"}</b> is{" "}
              <span className="font-semibold" style={{ color: it.direction === "except" ? "#C0603A" : "#3F7A52" }}>
                {it.direction === "except" ? "weaker" : "stronger"}
              </span>{" "}
              when <b>{it.x2 || "X2"}</b> {it.direction === "except" ? "(except when)" : "(especially when)"}.
            </p>
            {it.mechanism && (
              <div className="mt-2 text-sm text-slate-700"><span className="font-semibold text-ink">Because: </span>{it.mechanism}</div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-700">{it.mainEffectNote || "The contribution is a main effect, not a moderation."}</p>
        )}
      </Section>
    </div>
  );
}

function Section({ anchor, eyebrow, accent, children }: { anchor: string; eyebrow: string; accent: string; children: React.ReactNode }) {
  return (
    <div data-guide={anchor} className="rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{eyebrow}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <p className="mt-0.5 text-sm text-slate-700">{children}</p>
    </div>
  );
}
function Chip({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-line bg-mist/50 p-2.5">
      <div className="font-mono text-[11px] text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink">{value || "—"}</div>
    </div>
  );
}
function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
