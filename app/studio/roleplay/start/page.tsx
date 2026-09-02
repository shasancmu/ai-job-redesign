import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import IntentStart from "@/components/IntentStart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "New role play" };

export default async function StartRoleplay() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio/roleplay" className="text-sm text-slate2 hover:text-ink">← Modules</Link><HeaderNav /></div>
      </header>
      <IntentStart me={user.id} />
    </main>
  );
}
