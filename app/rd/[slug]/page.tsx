import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getRedesignSpec } from "@/lib/mechanics/redesignStore";
import RedesignLobby from "@/components/RedesignLobby";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RedesignLanding({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/rd/${params.slug}`);
  const spec = await getRedesignSpec(params.slug);
  if (!spec) {
    return <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center"><Logo /><h1 className="mt-6 text-xl font-bold text-ink">Not found</h1></main>;
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6"><Logo href="/dashboard" /></div>
      <RedesignLobby me={user.id} slug={params.slug} name={spec.name} emoji={spec.emoji || "🤝"} />
    </main>
  );
}
