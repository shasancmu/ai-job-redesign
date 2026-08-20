import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { DEFAULT_CONFIG, coerceConfig } from "@/lib/benchmark";
import BenchmarkEditor from "@/components/BenchmarkEditor";

export const dynamic = "force-dynamic";

export default async function EditBenchmark() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  let cfg = DEFAULT_CONFIG;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("benchmark_config")
      .select("data")
      .eq("id", "default")
      .maybeSingle();
    if (data?.data) cfg = coerceConfig(data.data);
  } catch {
    /* service role not set — fall back to defaults */
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/facilitator/benchmark" className="text-sm text-slate2 hover:text-ink">← Back to the live benchmark</Link>
        <HeaderNav />
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">Edit benchmark questions</h1>
      <p className="mb-6 text-slate2">
        Paste your questions here. They&apos;re saved to your database (not the app code), so you can
        change them any time. Only you can see or edit them.
      </p>
      <BenchmarkEditor initial={cfg} />
    </main>
  );
}
