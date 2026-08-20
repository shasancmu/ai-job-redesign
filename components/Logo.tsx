"use client";

import { BRAND } from "@/lib/brand";
import { useTenant } from "@/components/TenantProvider";

// The app wordmark. In a white-label org it swaps to that org's logo + name;
// otherwise the default Superadditive mark (two overlapping discs whose overlap
// deepens to olive: the whole worth more than the parts).
export default function Logo({
  size = 30,
  wordmark = true,
  className = "",
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  const tenant = useTenant();
  const name = tenant?.name || BRAND.name;
  // A tenant's uploaded logo almost always already contains its name, so the
  // wordmark text beside it would just repeat it. Show the mark alone, a touch
  // larger. The default Superadditive disc mark still gets its wordmark.
  const hasTenantLogo = !!tenant?.logoUrl;
  const showWordmark = wordmark && !hasTenantLogo;
  const logoHeight = hasTenantLogo ? Math.round(size * 1.4) : size;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {hasTenantLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tenant!.logoUrl!} alt={name} style={{ height: logoHeight, maxWidth: logoHeight * 6 }} className="shrink-0 object-contain" />
      ) : (
        <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
          <g style={{ mixBlendMode: "multiply" }}>
            <circle cx="15.5" cy="20" r="11.5" fill="#4A6A4E" fillOpacity="0.92" />
            <circle cx="24.5" cy="20" r="11.5" fill="#CE8F2C" fillOpacity="0.92" />
          </g>
        </svg>
      )}
      {showWordmark && <span className="text-[1.1rem] font-bold tracking-tight text-ink">{name}</span>}
    </span>
  );
}
