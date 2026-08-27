import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getLiveSession } from "@/lib/mechanics/liveStore";
import LivePresenter from "@/components/LivePresenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LiveHost({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const found = await getLiveSession(params.code);
  if (!found || found.session.host_id !== user.id) redirect("/dashboard");
  const h = headers();
  const origin = `https://${h.get("host") || ""}`;
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-4"><Logo href="/dashboard" /></div>
      <LivePresenter sessionId={found.session.id} code={params.code.toUpperCase()} spec={found.spec} origin={origin} />
    </main>
  );
}
