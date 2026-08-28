import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { getNegScenario } from "@/lib/mechanics/negStore";
import NegEditor from "@/components/NegEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLANK: any = {
  kind: "multi-issue", slug: "", name: "New negotiation", counterpartName: "", youRole: "the Buyer", themRole: "the Seller",
  scenario: "", yourBatna: 600,
  issues: [{ key: "issue1", label: "", options: [{ label: "", you: 0, them: 0 }, { label: "", you: 0, them: 0 }] }],
};

export default async function EditNegotiation({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  const isNew = params.slug === "new";
  const scn = isNew ? BLANK : (await getNegScenario(params.slug)) || BLANK;
  let status: any = "draft";
  if (!isNew) { try { const { data } = await createAdminClient().from("negotiation_specs").select("status").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); status = data?.status || "draft"; } catch {} }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio/negotiation" className="text-sm text-slate2 hover:text-ink">← Negotiations</Link><HeaderNav /></div>
      </header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New negotiation" : `Edit: ${scn.name || params.slug}`}</h1>
      <NegEditor me={user.id} initial={scn} initialStatus={status} />
    </main>
  );
}
