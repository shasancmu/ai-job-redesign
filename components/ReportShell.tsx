import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import ShareReport from "@/components/ShareReport";
import PrintButton from "@/components/PrintButton";

// Shared chrome for owner-only report pages: logo + share + back, an eyebrow /
// title, and either the report or a "not built yet" empty state.
export default function ReportShell({
  code,
  eyebrow,
  title,
  backLabel = "← Back",
  shareTitle,
  shareText,
  hasReport,
  emptyText = "This hasn't been built yet.",
  openLabel = "Open the interview",
  children,
}: {
  code: string;
  eyebrow: string;
  title: string;
  backLabel?: string;
  shareTitle: string;
  shareText: string;
  hasReport: boolean;
  emptyText?: string;
  openLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2 no-print">
          {hasReport && <PrintButton />}
          {hasReport && <ShareReport code={code} title={shareTitle} text={shareText} />}
          <Link href={`/room/${code}`} className="btn-ghost text-sm">{backLabel}</Link>
        </div>
      </header>

      <div className="mb-6">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{eyebrow}</div>
        <h1 className="mt-1 text-3xl text-ink">{title}</h1>
      </div>

      {hasReport ? (
        children
      ) : (
        <div className="card p-8 text-center">
          <p className="text-slate-600">{emptyText}</p>
          <Link href={`/room/${code}`} className="btn-primary mt-4 inline-block text-sm">{openLabel}</Link>
        </div>
      )}
    </main>
  );
}
