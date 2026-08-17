import type { BiPair } from "@/lib/i18n";

// Bilingual label — English primary, translation in a lighter secondary tone.
// When there's no translation (English locale, or a key with no distinct
// translation) it renders just the English with no wrapper, so the layout is
// identical to a plain label. Two shapes:
//   • stacked (default): translation sits on a smaller, muted line below.
//   • inline:  "English · translation" on one line (for compact links/labels).
export default function Bi({
  en,
  tr,
  inline = false,
  className = "",
  subClassName = "",
}: BiPair & { inline?: boolean; className?: string; subClassName?: string }) {
  if (!tr) return <>{en}</>;
  if (inline) {
    return (
      <span className={className}>
        {en}
        <span className={"font-normal opacity-50 " + subClassName}> · {tr}</span>
      </span>
    );
  }
  return (
    <span className={"inline-flex flex-col leading-tight " + className}>
      <span>{en}</span>
      <span className={"mt-0.5 text-[0.72em] font-normal tracking-normal opacity-55 " + subClassName}>
        {tr}
      </span>
    </span>
  );
}
