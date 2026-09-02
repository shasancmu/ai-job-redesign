import Logo from "@/components/Logo";
import { createAdminClient } from "@/lib/supabase/admin";
import ShowcaseReport from "@/components/ShowcaseReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC (link-shared): a presenter opens their feedback report.
export const metadata = { title: "Showcase entry" };

export default async function ShowcaseReportPage({ params }: { params: { code: string; itemId: string } }) {
  const code = String(params.code || "").toUpperCase();
  const itemId = String(params.itemId || "");

  let report: any = null;
  let item: any = null;
  let title = "";
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("showcase_sessions").select("title, items, reports").eq("code", code).maybeSingle();
    if (data) {
      title = (data.title as string) || "";
      item = (Array.isArray(data.items) ? data.items : []).find((it: any) => it.id === itemId) || null;
      report = ((data.reports as any) || {})[itemId] || null;
    }
  } catch { report = null; }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/" />
        {title && <div className="text-sm text-slate-400">{title}</div>}
      </header>
      {report ? (
        <>
          <div className="mb-4">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your feedback report</div>
            <h1 className="mt-1 text-3xl text-ink">{item?.title || "Your presentation"}</h1>
          </div>
          <ShowcaseReport report={report} presenter={item?.presenter} />
        </>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-slate-600">This report isn't ready yet. Check back once the facilitator has generated it.</p>
        </div>
      )}
    </main>
  );
}
