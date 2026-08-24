import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import { loadDeck } from "@/lib/decks";
import DeckBuilder from "@/components/DeckBuilder";

export const dynamic = "force-dynamic";

export default async function EditDeckPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  const deck = await loadDeck(params.slug, user.id);
  if (!deck) redirect("/decks");

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/decks" className="text-sm text-slate2 hover:text-ink">← Your presentations</Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">Edit presentation</h1>
        </div>
        <Link href={`/decks/${deck.slug}/present`} target="_blank" className="btn-ghost text-sm">Present →</Link>
      </div>
      <DeckBuilder initial={{ title: deck.title, slides: deck.slides }} editSlug={deck.slug} />
    </main>
  );
}
