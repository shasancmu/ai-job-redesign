import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import NetworkGraph from "@/components/NetworkGraph";
import NetworkDescribe from "@/components/NetworkDescribe";
import LiveStage from "@/components/LiveStage";
import CohortChooser from "@/components/CohortChooser";

export const dynamic = "force-dynamic";

export default async function FacilitatorNetwork({
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

  if (!cohort) {
    const { data: classes } = await supabase
      .from("classes")
      .select("code, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    return <CohortChooser title="The Network" basePath="/facilitator/network" cohorts={(classes as any) || []} />;
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
      <a href={`/api/network/export?cohort=${encodeURIComponent(cohort)}`} className="btn-ghost text-sm">↓ CSV</a>
      <Link href={`/facilitator/network/edit?cohort=${encodeURIComponent(cohort)}`} className="btn-ghost text-sm">Edit roster</Link>
    </>
  );

  return (
    <LiveStage
      eyebrow="Live · network"
      title="Map the room's real network"
      subtitle="The graph redraws as people respond. Names stay hidden on the plot. Project this."
      code={cohort}
      joinHost={host.replace(/^www\./, "")}
      qrSvg={qrSvg}
      doneHref={`/facilitator?cohort=${encodeURIComponent(cohort)}`}
      actions={actions}
    >
      <div className="rounded-3xl border border-line bg-white/70 p-6 shadow-lift backdrop-blur">
        <NetworkGraph cohort={cohort} big />
      </div>
      <div className="mt-5">
        <NetworkDescribe cohort={cohort} />
      </div>
    </LiveStage>
  );
}
