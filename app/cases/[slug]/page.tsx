import { notFound } from "next/navigation";
import LivingCaseReader from "@/components/LivingCaseReader";
import { caseBySlug, allCases } from "@/lib/cases/registry";

export const dynamic = "force-static";

export function generateStaticParams() {
  return allCases().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = caseBySlug(params.slug);
  return { title: c ? `${c.title} · Living Case` : "Living Case" };
}

export default function CasePage({ params }: { params: { slug: string } }) {
  const genome = caseBySlug(params.slug);
  if (!genome) notFound();
  return <LivingCaseReader genome={genome} />;
}
