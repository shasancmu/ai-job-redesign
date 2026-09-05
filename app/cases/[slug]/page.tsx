import { notFound } from "next/navigation";
import LivingCaseReader from "@/components/LivingCaseReader";
import { caseBySlug } from "@/lib/cases/registry";
import { loadLivingCase } from "@/lib/cases/store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const c = caseBySlug(params.slug);
  return { title: c ? `${c.title} · Living Case` : "Living Case" };
}

export default async function CasePage({ params }: { params: { slug: string } }) {
  // Built-in cases first (hand-authored), then authored/generated ones from the DB.
  let genome = caseBySlug(params.slug);
  if (!genome) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    genome = await loadLivingCase(params.slug, user?.id ?? null);
  }
  if (!genome) notFound();
  return <LivingCaseReader genome={genome} />;
}
