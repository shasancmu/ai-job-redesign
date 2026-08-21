import { createClient } from "@/lib/supabase/server";
import { moduleByExercise } from "@/lib/modules";
import { getModuleIntro } from "@/lib/moduleIntros";
import ModuleIntro from "@/components/ModuleIntro";

export const dynamic = "force-dynamic";

// Wraps every exercise room with its first-run "teaching moment". Resolving the
// module here (from the session's exercise) keeps the intro DRY across all the
// different room components — none of them need to know about it.
export default async function RoomLayout({ children, params }: { children: React.ReactNode; params: { code: string } }) {
  let mod = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.from("sessions").select("exercise").eq("code", params.code.toUpperCase()).maybeSingle();
    mod = data?.exercise ? moduleByExercise(data.exercise) : null;
  } catch { /* no intro if we can't resolve it */ }

  return (
    <>
      {children}
      {mod && <ModuleIntro slug={mod.slug} name={mod.name} steps={getModuleIntro(mod).steps} />}
    </>
  );
}
