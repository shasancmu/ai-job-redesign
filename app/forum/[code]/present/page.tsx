import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import ForumPresenter from "@/components/ForumPresenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Open floor · present" };

export default async function ForumPresent({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("forum_sessions")
    .select("id, code, topic, status, verdict, host_id")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id) redirect("/facilitator/forum");

  const h = headers();
  const host = h.get("host") || "superadditive.app";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/forum/${session.code}`;
  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  } catch {
    qrSvg = "";
  }

  return (
    <ForumPresenter
      code={session.code}
      topic={session.topic || ""}
      initialStatus={session.status}
      initialVerdict={(session.verdict as any) || null}
      joinHost={`${host.replace(/^www\./, "")}/forum`}
      qrSvg={qrSvg}
    />
  );
}
