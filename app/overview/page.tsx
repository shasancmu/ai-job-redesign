import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import DeckPresenter from "@/components/DeckPresenter";
import { buildCatalogSlides } from "@/lib/catalogDeck";

export const dynamic = "force-dynamic";

// The module-library overview, auto-generated from the registry and played
// through the deck presenter. For instructors, directors, and superadmins.
export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  return <DeckPresenter slides={buildCatalogSlides()} exitHref="/dashboard" />;
}
