import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProblemHuntRoom from "@/components/ProblemHuntRoom";
import { HUNT, type HuntMode } from "@/lib/problemhunt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { mode: string } }) {
  const cfg = (HUNT as any)[params.mode];
  return { title: cfg ? cfg.label : "Problem Hunt" };
}

export default async function HuntPage({ params }: { params: { mode: string } }) {
  if (params.mode !== "seller" && params.mode !== "leader") notFound();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/hunt/${params.mode}`);
  return <ProblemHuntRoom mode={params.mode as HuntMode} />;
}
