import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import RoadmapFullView from "@/components/RoadmapFullView";
import { getServerLocale } from "@/lib/i18n-server";
import { makeT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function RoadmapPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = isAdmin(user.email);
  let db: any = supabase;
  if (admin) {
    try {
      db = createAdminClient();
    } catch {
      /* fall back to user client */
    }
  }

  const { data: session } = await db.from("sessions").select("id, host_id, guest_id").eq("code", code).maybeSingle();
  if (!session) redirect("/dashboard");
  if (!admin && session.host_id !== user.id && session.guest_id !== user.id) redirect("/dashboard");

  const authorId = admin ? session.host_id : user.id;
  const { data: ws } = await db.from("workspaces").select("canvas").eq("session_id", session.id).eq("author_id", authorId).maybeSingle();
  const roadmap = (ws?.canvas as any)?.roadmap;

  if (!roadmap || !Array.isArray(roadmap.targets) || roadmap.targets.length === 0) {
    const t = makeT(await getServerLocale());
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-ink">{t("roadmap.nothingYet")}</h1>
        <p className="mt-2 text-slate2">{t("roadmap.nothingBody")}</p>
        <Link href={`/room/${code}`} className="btn-primary mt-6">{t("roadmap.backExercise")}</Link>
      </main>
    );
  }

  return <RoadmapFullView roadmap={roadmap} code={code} />;
}
