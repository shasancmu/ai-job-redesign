import { BRAND } from "@/lib/brand";

// Two overlapping discs — sage (plants) + amber (sun) — whose overlap deepens
// to olive: the whole worth more than the parts. Pure SVG, no image.
export default function Logo({
  size = 30,
  wordmark = true,
  className = "",
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="shrink-0"
      >
        <g style={{ mixBlendMode: "multiply" }}>
          <circle cx="15.5" cy="20" r="11.5" fill="#4A6A4E" fillOpacity="0.92" />
          <circle cx="24.5" cy="20" r="11.5" fill="#CE8F2C" fillOpacity="0.92" />
        </g>
      </svg>
      {wordmark && (
        <span className="font-display text-[1.15rem] font-medium tracking-tight text-ink">
          {BRAND.name}
        </span>
      )}
    </span>
  );
}
