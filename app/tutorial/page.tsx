import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import DeckPresenter from "@/components/DeckPresenter";
import { TUTORIAL_SLIDES } from "@/lib/tutorialDeck";

export const dynamic = "force-dynamic";

// The built-in facilitator tour, played through the deck presenter. Open to
// instructors, directors, and superadmins.
export default async function TutorialPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  return <DeckPresenter slides={TUTORIAL_SLIDES} exitHref="/dashboard" />;
}
