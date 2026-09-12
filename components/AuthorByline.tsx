import Link from "next/link";
import type { CreatorIdentity } from "@/lib/creator";

// "Created by <Name> · <Institution> ✓" — shown only on modules the author chose to
// sign. The check means the institution is confirmed by current org membership.
// Presentational (no hooks), so it drops into server or client renders alike.
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

export default function AuthorByline({ creator, size = "md", showLogo = false, className = "" }: { creator: CreatorIdentity; size?: "sm" | "md"; showLogo?: boolean; className?: string }) {
  const sm = size === "sm";
  const av = sm ? "h-5 w-5 text-[9px]" : "h-8 w-8 text-xs";
  const logo = showLogo && creator.institutionLogoUrl;
  const inner = (
    <span className={"inline-flex items-center gap-2 " + className}>
      {creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt="" className={"shrink-0 rounded-full object-cover " + av} />
      ) : (
        <span className={"inline-flex shrink-0 items-center justify-center rounded-full bg-mist font-semibold text-slate-500 " + av}>{initials(creator.name)}</span>
      )}
      <span className={sm ? "text-xs text-slate-500" : "text-sm text-slate-600"}>
        <span className="text-slate-400">Created by </span>
        <span className="font-semibold text-ink">{creator.name}</span>
        {creator.institution && (
          <>
            <span className="text-slate-300"> · </span>
            <span>{creator.institution}</span>
            {creator.verified && <span title="Affiliation verified" className="ml-0.5 text-ai">✓</span>}
          </>
        )}
      </span>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.institutionLogoUrl} alt={creator.institution || "school"} className={"shrink-0 rounded object-contain " + (sm ? "h-5" : "h-7")} />
      )}
    </span>
  );
  // Link to the creator's page when we have a handle (or fall back to their id).
  const href = creator.handle ? `/by/${creator.handle}` : creator.id ? `/by/${creator.id}` : null;
  return href ? <Link href={href} className="group inline-flex hover:opacity-80">{inner}</Link> : inner;
}
