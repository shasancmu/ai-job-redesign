import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import Translator from "@/components/Translator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Translate across frames" };

// Prototype: the cross-domain idea translator. Two people, an idea, and the AI
// re-expresses it in the recipient's professional/disciplinary frame.
export default async function TranslatePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/translate");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Dashboard</Link><HeaderNav /></div>
      </header>

      <h1 className="font-serif text-4xl leading-tight text-ink">Translate across frames</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate2">
        Two people from different worlds. Type an idea as one of them, and see it re-expressed in the other&apos;s frame&nbsp;— their primitives, what they care about, and an analogy from their own field&nbsp;— not dumbed down, just made legible.
      </p>

      <div className="mt-8"><Translator /></div>
    </main>
  );
}
