import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moduleBySlug } from "@/lib/modules";
import PairUp from "@/components/PairUp";

export const dynamic = "force-dynamic";

export default async function PairPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/pair/${params.slug}`);

  const mod = moduleBySlug(params.slug);
  if (!mod || (mod.exercise !== "job" && mod.exercise !== "workflow")) {
    redirect("/dashboard");
  }

  return (
    <PairUp
      userId={user.id}
      moduleName={mod.name}
      exercise={mod.exercise}
      cohort={searchParams.cohort || ""}
    />
  );
}
