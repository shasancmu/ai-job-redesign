"use client";

import Link from "next/link";
import CareerRoadmapView from "@/components/CareerRoadmapView";
import Logo from "@/components/Logo";
import ShareReport from "@/components/ShareReport";
import { useT } from "@/components/I18nProvider";

// Fullscreen, printable roadmap. The top bar is hidden when printing so the
// page prints as a clean artifact.
export default function RoadmapFullView({ roadmap, code }: { roadmap: any; code: string }) {
  const t = useT();
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <ShareReport code={code} title="A career roadmap" text="Here's my career roadmap from Superadditive:" />
          <Link href={`/room/${code}`} className="btn-ghost text-sm">{t("roadmap.backExercise")}</Link>
          <button onClick={() => window.print()} className="btn-primary text-sm">{t("roadmap.print")}</button>
        </div>
      </div>
      <CareerRoadmapView roadmap={roadmap} />
    </main>
  );
}
