import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadDeck } from "@/lib/decks";
import DeckPresenter from "@/components/DeckPresenter";

export const dynamic = "force-dynamic";

// Full-screen presenter. Author-only (they are the host of every embedded
// activity, so the iframed present views authorize automatically).
export default async function PresentDeckPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const deck = await loadDeck(params.slug, user.id);
  if (!deck || !deck.slides?.length) redirect("/decks");

  return <DeckPresenter slides={deck.slides} />;
}
