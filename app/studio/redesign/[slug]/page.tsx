import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { getRedesignSpec } from "@/lib/mechanics/redesignStore";
import RedesignEditor from "@/components/RedesignEditor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BLANK: any = { slug: "", name: "New paired redesign", emoji: "🤝", subject: "job", setupPrompt: "Write your own in a line or two.", interviewPrompt: "Draw out what they actually do and what matters in it.", splitTitle: "The AI × Human split", splitIntro: "Delegate to AI what is search/structure/draft; keep human what needs judgment, ownership, and relationships.", buckets: [{ key: "search", label: "Search", role: "ai", hint: "find and surface" }, { key: "draft", label: "Draft", role: "ai", hint: "produce first versions" }, { key: "judge", label: "Judge", role: "human", hint: "decide what's good" }, { key: "own", label: "Own", role: "human", hint: "stand behind it" }] };
export const metadata = { title: "Edit redesign" };

export default async function EditRedesign({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");
  const isNew = params.slug === "new";
  const spec = isNew ? BLANK : (await getRedesignSpec(params.slug)) || BLANK;
  let status: any = "draft";
  if (!isNew) { try { const { data } = await createAdminClient().from("redesign_specs").select("status").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); status = data?.status || "draft"; } catch {} }
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio/redesign" className="text-sm text-slate2 hover:text-ink">← Redesigns</Link><HeaderNav /></div></header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New paired redesign" : `Edit: ${spec.name || params.slug}`}</h1>
      <RedesignEditor me={user.id} initial={spec} initialStatus={status} />
    </main>
  );
}
