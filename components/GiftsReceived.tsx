import Link from "next/link";

export type Gift = { code: string; giverName: string };

// Dashboard card: reimagined-role gifts a partner designed for you, each opening
// the wrapped reveal at /gift/[code].
export default function GiftsReceived({ gifts }: { gifts: Gift[] }) {
  if (!gifts.length) return null;
  const one = gifts.length === 1;
  return (
    <div className="card overflow-hidden p-0">
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #3F7A52, #CE8F2C)" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 text-lg font-bold text-ink">
          <span aria-hidden>🎁</span>
          {one ? "A gift for you" : "Gifts for you"}
        </div>
        <p className="mt-1 text-sm text-slate2">
          A partner reimagined your role. Unwrap {one ? "it" : "them"}.
        </p>
        <div className="mt-4 space-y-2">
          {gifts.map((g) => (
            <Link
              key={g.code}
              href={`/gift/${g.code}`}
              className="flex items-center justify-between rounded-xl border border-line bg-mist/50 px-4 py-3 transition hover:border-sage hover:bg-mist"
            >
              <span className="text-sm">
                <span className="text-slate2">From </span>
                <span className="font-semibold text-ink">{g.giverName}</span>
              </span>
              <span className="text-sm font-semibold text-sage">Open &rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
