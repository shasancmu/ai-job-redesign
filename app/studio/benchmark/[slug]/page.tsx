import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { getBenchConfig } from "@/lib/mechanics/benchStore";
import BenchEditor from "@/components/BenchEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLANK: any = { slug: "", name: "New benchmark", timeLimitSec: 300, questions: [{ id: 1, prompt: "", options: [{ key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" }], answer: "A" }] };

export default async function EditBenchmark({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0)) redirect("/dashboard");

  const isNew = params.slug === "new";
  const cfg = isNew ? BLANK : { ...(await getBenchConfig(params.slug)) || BLANK, slug: params.slug };
  let status: any = "draft";
  if (!isNew) { try { const { data } = await createAdminClient().from("benchmark_specs").select("status, spec").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); status = data?.status || "draft"; if (data?.spec?.name) (cfg as any).name = data.spec.name; } catch {} }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio/benchmark" className="text-sm text-slate2 hover:text-ink">← Benchmarks</Link><HeaderNav /></div>
      </header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New benchmark" : `Edit: ${(cfg as any).name || params.slug}`}</h1>
      <BenchEditor me={user.id} initial={cfg} initialStatus={status} />
    </main>
  );
}
