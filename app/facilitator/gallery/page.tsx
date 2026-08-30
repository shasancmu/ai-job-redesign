import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import HeaderNav from "@/components/HeaderNav";
import { isAdmin } from "@/lib/admin";
import PhotoManager from "@/components/PhotoManager";

export const dynamic = "force-dynamic";

// Photo Gallery: like the Photo Wall, but the actual (scaled-down) photos appear
// on the shared screen with captions. Reuses the photo activity with show_photos.
export default async function FacilitatorGallery() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("photo_sessions")
    .select("id, code, prompt, status, created_at")
    .eq("host_id", user.id)
    .eq("show_photos", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
          <HeaderNav />
        </div>
        <h1 className="mt-1 text-3xl text-ink">Photo Gallery</h1>
        <p className="mt-1 text-slate2">
          The room takes photos from their phones. The actual photos, scaled down, appear on the shared screen,
          each captioned by AI, then AI summarizes what the room showed.
        </p>
      </div>
      <PhotoManager me={user.id} initial={(sessions as any) || []} showPhotos />
    </main>
  );
}
