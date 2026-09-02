import Logo from "@/components/Logo";
import ForumJoin from "@/components/ForumJoin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no sign-in. Reads the topic via the service role.
export const metadata = { title: "Open floor" };

export default async function ForumJoinPage({ params }: { params: { code: string } }) {
  const code = String(params.code || "").toUpperCase();

  let session: { topic: string; status: string } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("forum_sessions").select("topic, status").eq("code", code).maybeSingle();
    session = (data as any) || null;
  } catch {
    session = null;
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 py-6">
      <div className="mb-4 flex justify-center">
        <Logo />
      </div>

      {!session ? (
        <div className="card p-7 text-center">
          <h1 className="text-xl font-bold text-ink">Code not found</h1>
          <p className="mt-2 text-sm text-slate2">Double-check the code on the screen, or scan the QR again.</p>
        </div>
      ) : session.status === "closed" ? (
        <div className="card p-7 text-center">
          <div className="mb-2 text-2xl">💬</div>
          <h1 className="text-xl font-bold text-ink">This chat is closed</h1>
          <p className="mt-2 text-sm text-slate2">Thanks for taking part.</p>
        </div>
      ) : (
        <ForumJoin code={code} topic={session.topic} />
      )}
    </main>
  );
}
