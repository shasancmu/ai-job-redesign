import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { getAnalyticalSpec } from "@/lib/mechanics/analyticalStore";
import AnalyticalEditor from "@/components/AnalyticalEditor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BLANK: any = { slug: "", name: "New instrument", emoji: "📊", subject: "", unitLabel: "task", setupLabel: "", setupPlaceholder: "", decompose: "", lens: "", aggregateLabel: "Overall", levels: [{ key: "L0", label: "None", desc: "", value: 0 }, { key: "L1", label: "Some", desc: "", value: 50 }, { key: "L2", label: "High", desc: "", value: 100 }] };
export default async function EditAnalytical({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0)) redirect("/dashboard");
  const isNew = params.slug === "new";
  const spec = isNew ? BLANK : (await getAnalyticalSpec(params.slug)) || BLANK;
  let status: any = "draft";
  if (!isNew) { try { const { data } = await createAdminClient().from("analytical_specs").select("status").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); status = data?.status || "draft"; } catch {} }
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio/analytical" className="text-sm text-slate2 hover:text-ink">← Instruments</Link><HeaderNav /></div></header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New instrument" : `Edit: ${spec.name || params.slug}`}</h1>
      <AnalyticalEditor me={user.id} initial={spec} initialStatus={status} />
    </main>
  );
}
