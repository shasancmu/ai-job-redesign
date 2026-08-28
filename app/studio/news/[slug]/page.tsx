import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { getNewsSpec } from "@/lib/mechanics/newsStore";
import NewsFrameEditor from "@/components/NewsFrameEditor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BLANK: any = { slug: "", name: "New framework desk", emoji: "🗞️", topic: "", framework: "", frameworkLogic: "", fields: [{ key: "f1", label: "", hint: "" }, { key: "f2", label: "", hint: "" }], verdict: { label: "", options: [] }, grading: "" };
export default async function EditNews({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");
  const isNew = params.slug === "new";
  const spec = isNew ? BLANK : (await getNewsSpec(params.slug)) || BLANK;
  let status: any = "draft";
  if (!isNew) { try { const { data } = await createAdminClient().from("newsframe_specs").select("status").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); status = data?.status || "draft"; } catch {} }
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio/news" className="text-sm text-slate2 hover:text-ink">← In the News</Link><HeaderNav /></div></header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New framework desk" : `Edit: ${spec.name || params.slug}`}</h1>
      <NewsFrameEditor me={user.id} initial={spec} initialStatus={status} />
    </main>
  );
}
