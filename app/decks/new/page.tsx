import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import DeckBuilder from "@/components/DeckBuilder";

export const dynamic = "force-dynamic";

export const metadata = { title: "New deck" };

export default async function NewDeckPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="mb-5">
        <Link href="/decks" className="text-sm text-slate2 hover:text-ink">← Your presentations</Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">New presentation</h1>
        <p className="mt-1 text-sm text-slate-500">Mix static slides with live activities. Save, then present full-screen.</p>
      </div>
      <DeckBuilder />
    </main>
  );
}
