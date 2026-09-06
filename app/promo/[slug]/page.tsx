import { notFound } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { getAdBySlug, isLive, recordAdEvent } from "@/lib/ads";
import AdActions from "@/components/AdActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const ad = await getAdBySlug(params.slug);
  return { title: ad?.title || "Spotlight" };
}

// The internal landing page a spotlight card links to. Logs a click-through on
// load; the CTA and "I'm interested" fire their own events from the client.
export default async function PromoPage({ params, searchParams }: { params: { slug: string }; searchParams?: { c?: string } }) {
  const ad = await getAdBySlug(params.slug);
  if (!ad) notFound();

  const { data: { user } } = await createClient().auth.getUser();
  const role = user ? await roleFor(user) : null;
  const isOwner = !!role && (role.superadmin || role.directorOrgIds.includes(ad.org_id));

  // A draft is visible only to the org's owner (preview); everyone else 404s.
  if (!isLive(ad) && !isOwner) notFound();

  // Real visits are the click-through metric; an owner previewing doesn't inflate it.
  if (isLive(ad) && !isOwner) {
    await recordAdEvent(ad.id, "click", { orgId: ad.org_id, userId: user?.id || null, cohort: searchParams?.c || null });
  }

  let orgName = "";
  try { const { data } = await createAdminClient().from("organizations").select("name").eq("id", ad.org_id).maybeSingle(); orgName = (data as any)?.name || ""; } catch { /* none */ }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <Logo href="/dashboard" />
          {user && <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Dashboard</Link>}
        </header>

        {!isLive(ad) && isOwner && (
          <div className="mb-5 rounded-xl border border-amber-soft bg-amber-soft/40 px-4 py-2.5 text-sm text-amber-700">Preview — this spotlight is a {ad.status}. Only you can see it until it&apos;s published.</div>
        )}

        {ad.image_url && (
          <img src={ad.image_url} alt="" className="mb-6 w-full rounded-2xl border border-line object-cover" style={{ maxHeight: 320 }} />
        )}

        {orgName && <div className="text-xs font-semibold uppercase tracking-wide text-ai">A program from {orgName}</div>}
        <div className="mt-2 flex items-start gap-3">
          {ad.emoji && <span className="text-4xl leading-none" aria-hidden>{ad.emoji}</span>}
          <h1 className="font-serif text-3xl leading-tight text-ink">{ad.title}</h1>
        </div>
        {ad.tagline && <p className="mt-2 text-lg leading-relaxed text-slate2">{ad.tagline}</p>}

        {ad.body && (
          <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{ad.body}</div>
        )}

        <div className="mt-8">
          <AdActions adId={ad.id} ctaLabel={ad.cta_label} ctaUrl={ad.cta_url} cohort={searchParams?.c || null} signedIn={!!user} />
        </div>
      </div>
    </main>
  );
}
