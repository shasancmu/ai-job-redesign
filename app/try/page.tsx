import Link from "next/link";
import Logo from "@/components/Logo";
import QuickTake from "@/components/QuickTake";

export const dynamic = "force-dynamic";
export const metadata = { title: "Try it" };

// Public "first level": the 90-second quick take runs here with no account, and
// the reveal is the reason to sign up (value before the gate).
export default function TryPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="text-sm font-semibold text-ink/80 hover:text-ink">Sign in</Link>
      </header>
      <div className="flex flex-1 items-center">
        <div className="w-full py-8"><QuickTake /></div>
      </div>
    </main>
  );
}
