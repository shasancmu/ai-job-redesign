import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import BenchmarkHistogram from "@/components/BenchmarkHistogram";
import ResetBenchmarkButton from "@/components/ResetBenchmarkButton";
import LiveStage from "@/components/LiveStage";
import CohortChooser from "@/components/CohortChooser";

export const dynamic = "force-dynamic";

export default async function FacilitatorBenchmark({
  searchParams,
}: {
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const cohort = searchParams.cohort;

  // Launched from the hub with no cohort → pick one.
  if (!cohort) {
    const { data: classes } = await supabase
      .from("classes")
      .select("code, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    return <CohortChooser title="The Benchmark" basePath="/facilitator/benchmark" cohorts={(classes as any) || []} />;
  }

  const h = headers();
  const host = h.get("host") || "superadditive.app";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/${cohort}`;
  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  } catch {
    qrSvg = "";
  }

  const actions = (
    <>
      <Link href="/facilitator/benchmark/edit" className="btn-ghost text-sm">Edit questions</Link>
      <a href={`/api/benchmark/export?cohort=${encodeURIComponent(cohort)}`} className="btn-ghost text-sm">↓ CSV</a>
      <ResetBenchmarkButton cohort={cohort} />
    </>
  );

  return (
    <LiveStage
      eyebrow="Live · benchmark"
      title="Test yourself against the machine"
      subtitle="Scores update as the room submits. Project this."
      code={cohort}
      joinHost={host.replace(/^www\./, "")}
      qrSvg={qrSvg}
      doneHref={`/facilitator?cohort=${encodeURIComponent(cohort)}`}
      actions={actions}
    >
      <div className="rounded-3xl border border-line bg-white/70 p-8 shadow-lift backdrop-blur">
        <BenchmarkHistogram cohort={cohort} big />
      </div>
    </LiveStage>
  );
}
