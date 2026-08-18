import Logo from "@/components/Logo";
import CloudSubmit from "@/components/CloudSubmit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no sign-in. Reads the question via the service role (RLS otherwise
// hides the host's session from anonymous visitors).
export default async function CloudJoin({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();

  let session: { question: string; status: string } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("cloud_sessions")
      .select("question, status")
      .eq("code", code)
      .maybeSingle();
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
          <p className="mt-2 text-sm text-slate2">
            Double-check the code on the screen, or scan the QR again.
          </p>
          <a href="/cloud" className="btn-ghost mt-5 inline-block">Try another code</a>
        </div>
      ) : session.status === "closed" ? (
        <div className="card p-7 text-center">
          <div className="mb-2 text-2xl">🌥️</div>
          <h1 className="text-xl font-bold text-ink">This word cloud is closed</h1>
          <p className="mt-2 text-sm text-slate2">Thanks for taking part.</p>
        </div>
      ) : (
        <CloudSubmit code={code} question={session.question} />
      )}
    </main>
  );
}
