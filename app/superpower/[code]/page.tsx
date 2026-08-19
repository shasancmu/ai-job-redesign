import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SuperpowerReport from "@/components/SuperpowerReport";
import ShareReport from "@/components/ShareReport";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function SuperpowerView({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase.from("sessions").select("id, host_id").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) redirect("/dashboard");

  const { data: ws } = await supabase
    .from("workspaces")
    .select("canvas")
    .eq("session_id", session.id)
    .eq("author_id", user.id)
    .maybeSingle();
  const report = (ws?.canvas as any)?.report;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          {report && <ShareReport code={code} title="A superpower profile" text="Here's my Superpower profile from Superadditive:" />}
          <Link href={`/room/${code}`} className="btn-ghost text-sm">← Back to the interview</Link>
        </div>
      </header>

      <div className="mb-6">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Find Your Superpower</div>
        <h1 className="mt-1 text-3xl text-ink">Your superpower</h1>
      </div>

      {report ? (
        <SuperpowerReport report={report} />
      ) : (
        <div className="card p-8 text-center">
          <p className="text-slate-600">This hasn&apos;t been generated yet.</p>
          <Link href={`/room/${code}`} className="btn-primary mt-4 inline-block text-sm">Open the interview</Link>
        </div>
      )}
    </main>
  );
}
