import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { titleCaseName } from "@/lib/name";
import Onboarding from "@/components/Onboarding";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/welcome");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  // Already onboarded — nothing to do here.
  if (profile?.onboarded_at) redirect("/dashboard");

  const first = titleCaseName(
    (profile?.display_name || (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "")
  ).split(" ")[0];

  return <Onboarding me={user.id} firstName={first || undefined} />;
}
