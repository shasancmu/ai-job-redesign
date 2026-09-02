import Logo from "@/components/Logo";
import { getLiveSession, publicLiveSpec } from "@/lib/mechanics/liveStore";
import LiveSubmit from "@/components/LiveSubmit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no account needed: a participant joins a live activity by code.
export const metadata = { title: "Live activity" };

export default async function LiveJoin({ params }: { params: { code: string } }) {
  const found = await getLiveSession(params.code);
  if (!found) {
    return <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center"><Logo /><h1 className="mt-6 text-xl font-bold text-ink">Activity not found</h1><p className="mt-2 text-sm text-slate2">Check the code and try again.</p></main>;
  }
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-8 sm:px-6">
      <LiveSubmit spec={publicLiveSpec(found.spec)} code={params.code.toUpperCase()} />
    </main>
  );
}
