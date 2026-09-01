import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import PortraitChat from "@/components/PortraitChat";

export const dynamic = "force-dynamic";

// The reflective portrait — a person, in their own words. Read under their own
// session so they only ever see their own (RLS).
export default async function PortraitPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portrait");

  let existingReflection: string | null = null;
  const org = await getActiveOrg(user).catch(() => null);
  if (org) {
    const { data } = await supabase.from("learner_portrait").select("reflection").eq("user_id", user.id).eq("org_id", org.id).maybeSingle();
    existingReflection = (data as any)?.reflection || null;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Dashboard</Link><HeaderNav /></div>
      </header>
      <PortraitChat existingReflection={existingReflection} />
    </main>
  );
}
