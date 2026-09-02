import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { quizConfigForCode } from "@/lib/quizConfig";
import QuizPresenter from "@/components/QuizPresenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Quiz · present" };

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

  // Question count: this quiz's own config if it has one, else the shared set.
  const total = (await quizConfigForCode(code)).questions.length;

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
