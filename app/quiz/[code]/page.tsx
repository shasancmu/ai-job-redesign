import Logo from "@/components/Logo";
import QuizRoom from "@/components/QuizRoom";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no sign-in.
export const metadata = { title: "Quiz" };

export default async function QuizJoin({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();

  let status: string | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("quiz_sessions").select("status").eq("code", code).maybeSingle();
    status = (data as any)?.status ?? null;
  } catch {
    status = null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      {status === null ? (
        <div className="card p-7 text-center">
          <h1 className="text-xl font-bold text-ink">Code not found</h1>
          <p className="mt-2 text-sm text-slate2">Double-check the code on the screen, or scan the QR again.</p>
          <a href="/quiz" className="btn-ghost mt-5 inline-block">Try another code</a>
        </div>
      ) : status === "closed" ? (
        <div className="card p-7 text-center">
          <div className="mb-2 text-2xl">⏱️</div>
          <h1 className="text-xl font-bold text-ink">This quiz is closed</h1>
          <p className="mt-2 text-sm text-slate2">Thanks for taking part.</p>
        </div>
      ) : (
        <QuizRoom code={code} />
      )}
    </main>
  );
}
