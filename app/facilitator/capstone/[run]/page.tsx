import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import LiveRunBoard from "@/components/LiveRunBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CapstoneRunBoard({ params }: { params: { run: string } }) {
  const runCode = String(params.run || "").toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: run } = await admin.from("capstone_runs").select("label, host_id").eq("code", runCode).maybeSingle();

  const h = headers();
  const host = (h.get("host") || "superadditive.app").replace(/^www\./, "");

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/facilitator/capstone" className="text-sm text-slate2 hover:text-ink">← Class runs</Link>
          <HeaderNav />
        </div>
      </header>
      <LiveRunBoard runCode={runCode} label={run?.label || ""} joinHost={`${host}/capstone`} />
    </main>
  );
}
