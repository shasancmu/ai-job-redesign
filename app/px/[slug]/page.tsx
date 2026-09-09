import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPaperx } from "@/lib/paperx/store";
import PaperxReader from "@/components/PaperxReader";

export const dynamic = "force-dynamic";

// The learner-facing run page for a Paper Explainer.
export default async function PaperxRunPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/px/${params.slug}`);

  const g = await loadPaperx(params.slug, user.id);
  if (!g) redirect("/dashboard");

  const preview = g.generated === true && (await isDraft(params.slug, user.id));
  return <PaperxReader g={g} preview={preview} />;
}

// A draft (unpublished) explainer, opened by its author, shows the verify banner.
async function isDraft(slug: string, userId: string): Promise<boolean> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin.from("custom_modules").select("status, author_id").eq("slug", slug).maybeSingle();
    return !!data && (data as any).author_id === userId && (data as any).status !== "published";
  } catch { return false; }
}
