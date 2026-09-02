import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import BenchmarkHistogram from "@/components/BenchmarkHistogram";
import ResetBenchmarkButton from "@/components/ResetBenchmarkButton";
import LiveStage from "@/components/LiveStage";
import CohortChooser from "@/components/CohortChooser";

export const dynamic = "force-dynamic";

export const metadata = { title: "Benchmark" };

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
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

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

  // Participants join at /<cohort>, which only lists that cohort's own modules —
  // so hosting must guarantee "benchmark" is in the list, or they can't take part.
  try {
    const admin = createAdminClient();
    const { data: cls } = await admin.from("classes").select("id, modules").eq("code", cohort).maybeSingle();
    if (cls) {
      const mods: string[] = (((cls as any).modules as any[]) || []).map(String);
      if (!mods.includes("benchmark")) await admin.from("classes").update({ modules: [...mods, "benchmark"] }).eq("id", (cls as any).id);
    }
  } catch { /* best effort */ }

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
