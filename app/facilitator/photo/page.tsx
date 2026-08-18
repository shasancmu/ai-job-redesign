import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import PhotoManager from "@/components/PhotoManager";

export const dynamic = "force-dynamic";

export default async function FacilitatorPhoto() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("photo_sessions")
    .select("id, code, prompt, status, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Facilitator</Link>
        <h1 className="mt-1 text-3xl text-ink">Photo Wall</h1>
        <p className="mt-1 text-slate2">
          The room photographs something (a scene, an object, or handwritten text) from their phones. AI reads each
          image into text and the photo itself is never stored, then AI summarizes what the room showed.
        </p>
      </div>
      <PhotoManager me={user.id} initial={(sessions as any) || []} />
    </main>
  );
}
