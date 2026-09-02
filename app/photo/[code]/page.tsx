import Logo from "@/components/Logo";
import PhotoCapture from "@/components/PhotoCapture";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no sign-in. Reads the prompt via the service role.
export const metadata = { title: "Photo wall" };

export default async function PhotoJoin({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();

  let session: { prompt: string; status: string; show_photos?: boolean } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("photo_sessions").select("prompt, status, show_photos").eq("code", code).maybeSingle();
    session = (data as any) || null;
  } catch {
    session = null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      {!session ? (
        <div className="card p-7 text-center">
          <h1 className="text-xl font-bold text-ink">Code not found</h1>
          <p className="mt-2 text-sm text-slate2">Double-check the code on the screen, or scan the QR again.</p>
          <a href="/photo" className="btn-ghost mt-5 inline-block">Try another code</a>
        </div>
      ) : session.status === "closed" ? (
        <div className="card p-7 text-center">
          <div className="mb-2 text-2xl">📷</div>
          <h1 className="text-xl font-bold text-ink">This activity is closed</h1>
          <p className="mt-2 text-sm text-slate2">Thanks for taking part.</p>
        </div>
      ) : (
        <PhotoCapture code={code} prompt={session.prompt} showPhotos={!!session.show_photos} />
      )}
    </main>
  );
}
