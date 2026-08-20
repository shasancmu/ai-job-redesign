import { moduleFeatures } from "@/lib/modules";

// Subtle-but-obvious badges for a module's spoken/visual format, so a voice
// interview reads differently from a chat one at a glance. Shown on catalog and
// landing cards. (partner/AI/in-class already have the standardized chip.)
export default function FeatureBadges({ slug }: { slug: string }) {
  const f = moduleFeatures(slug);
  const voice = f.includes("voice");
  const camera = f.includes("camera");
  if (!voice && !camera) return null;

  return (
    <>
      {voice && (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-soft px-2 py-0.5 font-medium text-sky">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <path d="M12 19v3" />
          </svg>
          Voice
        </span>
      )}
      {camera && (
        <span className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2 py-0.5 font-medium text-clay">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14.5 4h-5L7.5 6.5H4A2 2 0 0 0 2 8.5v10A2 2 0 0 0 4 20.5h16a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2h-3.5z" />
            <circle cx="12" cy="13" r="3.2" />
          </svg>
          Camera
        </span>
      )}
    </>
  );
}
