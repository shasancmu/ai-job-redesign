import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import PhotoPresenter from "@/components/PhotoPresenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Photo wall · present" };

export default async function PhotoPresent({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("photo_sessions")
    .select("id, code, prompt, status, summary, host_id, show_photos")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id) redirect("/facilitator/photo");

  const h = headers();
  const host = h.get("host") || "superadditive.app";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/photo/${session.code}`;

  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  } catch {
    qrSvg = "";
  }

  return (
    <PhotoPresenter
      sessionId={session.id}
      code={session.code}
      prompt={session.prompt || ""}
      initialStatus={session.status}
      initialSummary={(session.summary as any) || null}
      joinHost={`${host.replace(/^www\./, "")}/photo`}
      qrSvg={qrSvg}
      showPhotos={!!(session as any).show_photos}
    />
  );
}
