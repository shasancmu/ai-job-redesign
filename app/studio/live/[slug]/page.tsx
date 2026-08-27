import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { getLiveSpec } from "@/lib/mechanics/liveStore";
import LiveEditor from "@/components/LiveEditor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BLANK: any = { slug: "", name: "New live activity", emoji: "🌥️", kind: "wordcloud", prompt: "", options: ["", ""], synthesize: true, synthesizePrompt: "" };
export default async function EditLive({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0)) redirect("/dashboard");
  const isNew = params.slug === "new";
  const spec = isNew ? BLANK : (await getLiveSpec(params.slug)) || BLANK;
  let status: any = "draft";
  if (!isNew) { try { const { data } = await createAdminClient().from("live_specs").select("status").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); status = data?.status || "draft"; } catch {} }
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio/live" className="text-sm text-slate2 hover:text-ink">← Live activities</Link><HeaderNav /></div></header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New live activity" : `Edit: ${spec.name || params.slug}`}</h1>
      <LiveEditor me={user.id} initial={spec} initialStatus={status} />
    </main>
  );
}
