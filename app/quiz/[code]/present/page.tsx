import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CONFIG, coerceConfig } from "@/lib/benchmark";
import QuizPresenter from "@/components/QuizPresenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function QuizPresent({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("id, code, status, host_id")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id) redirect("/facilitator/quiz");

  // Question count comes from the shared benchmark config.
  let total = DEFAULT_CONFIG.questions.length;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("benchmark_config").select("data").eq("id", "default").maybeSingle();
    total = coerceConfig(data?.data || DEFAULT_CONFIG).questions.length;
  } catch {
    /* fall back to default length */
  }

  const h = headers();
  const host = h.get("host") || "superadditive.app";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/quiz/${session.code}`;

  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  } catch {
    qrSvg = "";
  }

  return (
    <QuizPresenter
      sessionId={session.id}
      code={session.code}
      initialStatus={session.status}
      joinHost={`${host.replace(/^www\./, "")}/quiz`}
      qrSvg={qrSvg}
      total={total}
    />
  );
}
