import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import CloudPresenter from "@/components/CloudPresenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Host-only presenter view. Fullscreen-able; shows the question, the join QR,
// the live cloud, and the AI summary.
export default async function CloudPresent({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS scopes this to the host's own sessions.
  const { data: session } = await supabase
    .from("cloud_sessions")
    .select("id, code, question, status, summary, host_id")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id) redirect("/facilitator/cloud");

  const h = headers();
  const host = h.get("host") || "superadditive.app";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const joinUrl = `${origin}/cloud/${session.code}`;

  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  } catch {
    qrSvg = "";
  }

  return (
    <CloudPresenter
      sessionId={session.id}
      code={session.code}
      question={session.question || ""}
      initialStatus={session.status}
      initialSummary={(session.summary as any) || null}
      joinUrl={joinUrl}
      joinHost={`${host.replace(/^www\./, "")}/cloud`}
      qrSvg={qrSvg}
    />
  );
}
