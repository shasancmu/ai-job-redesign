import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import ShowcasePresenter from "@/components/ShowcasePresenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ShowcasePresent({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("showcase_sessions")
    .select("code, title, items, host_id")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id) redirect("/facilitator/showcase");

  const h = headers();
  const host = h.get("host") || "superadditive.app";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/showcase/${code}`;
  let qrSvg = "";
  try { qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" }); } catch { qrSvg = ""; }

  return (
    <ShowcasePresenter
      code={code}
      title={session.title || ""}
      items={(session.items as any) || []}
      joinHost={`${host.replace(/^www\./, "")}/showcase`}
      qrSvg={qrSvg}
    />
  );
}
