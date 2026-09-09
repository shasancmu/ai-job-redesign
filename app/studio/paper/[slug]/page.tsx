import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPaperx, paperxAuthorId } from "@/lib/paperx/store";
import PaperxEditor from "@/components/PaperxEditor";

export const dynamic = "force-dynamic";

// Edit an existing Paper Explainer — author only.
export default async function EditPaperxPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/studio/paper/${params.slug}`);

  const author = await paperxAuthorId(params.slug);
  if (author !== user.id) redirect("/studio/paper");
  const g = await loadPaperx(params.slug, user.id);
  if (!g) redirect("/studio/paper");

  return (
    <main className="min-h-screen bg-paper text-ink py-4">
      <PaperxEditor spec={g} editSlug={params.slug} />
    </main>
  );
}
