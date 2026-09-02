import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { facilitatorAccess } from "@/lib/orgs";
import CensusManager from "@/components/CensusManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Business census" };

export default async function FacilitatorCensus() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const acc = await facilitatorAccess(user);
  if (!(acc.superadmin || acc.orgIds.length > 0)) redirect("/dashboard");

  const { data: campaigns } = await supabase
    .from("business_campaigns")
    .select("id, code, label, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/data-collection" className="text-sm text-slate2 hover:text-ink">← Data collection</Link><HeaderNav /></div>
      </header>
      <h1 className="text-3xl text-ink">Business directory</h1>
      <p className="mt-1 text-slate2">
        A 10-minute, multimodal business profile that builds a catalog of the businesses in your program or region. Create a collection, share the link, and each completed profile adds a geocoded, industry-classified, management-scored firm record, with an instant read back to the respondent. Works worldwide.
      </p>
      <div className="mt-6"><CensusManager me={user.id} initial={(campaigns as any) || []} /></div>
    </main>
  );
}
