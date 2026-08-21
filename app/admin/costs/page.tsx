import HeaderNav from "@/components/HeaderNav";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { MODULES } from "@/lib/modules";
import { COST_ASSUMPTIONS } from "@/lib/costs";
import { FREE_TIER_RUNS, PAID_RUNS } from "@/lib/access";
import AdminCosts from "@/components/AdminCosts";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AdminCostsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard"); // admin-only

  const rows = MODULES.map((m) => ({
    slug: m.slug,
    name: m.name,
    a: COST_ASSUMPTIONS[m.slug] || { calls: 6, inTok: 1500, outTok: 500 },
  }));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <h1 className="text-2xl font-bold">Module unit costs</h1>
      <p className="mt-1 text-sm text-slate-500">
        Estimated AI cost per module run, and how it lands against your $29/yr and $19 prices. Only you can see this page.
      </p>
      <div className="mt-6">
        <AdminCosts rows={rows} freeRuns={FREE_TIER_RUNS} paidRuns={PAID_RUNS} priceAll={29} priceCohort={19} />
      </div>
    </main>
  );
}
