import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import Footer from "@/components/Footer";
import { getCreatorByHandle, listSignedModulesByAuthor } from "@/lib/creator";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { handle: string } }) {
  const c = await getCreatorByHandle(params.handle);
  return { title: c ? c.name : "Creator" };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

export default async function CreatorPage({ params }: { params: { handle: string } }) {
  const creator = await getCreatorByHandle(params.handle);
  if (!creator) notFound();
  const modules = await listSignedModulesByAuthor(creator.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {creator.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatarUrl} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-mist text-xl font-semibold text-slate-400">{initials(creator.name)}</div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink">{creator.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
            {creator.title && <span>{creator.title}</span>}
            {creator.title && creator.institution && <span className="text-slate-300">·</span>}
            {creator.institution && (
              <span className="inline-flex items-center gap-1.5">
                {creator.institutionLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={creator.institutionLogoUrl} alt="" className="h-5 w-auto rounded object-contain" />
                )}
                {creator.institution}
                {creator.verified && <span title="Affiliation verified" className="text-ai">✓</span>}
              </span>
            )}
          </div>
          {creator.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{creator.bio}</p>}
        </div>
      </section>

      <div className="mt-8 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Modules by {creator.name.split(/\s+/)[0]} <span className="text-slate-300">· signed with their own judgment</span>
      </div>

      {modules.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No signed modules yet.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {modules.map((m) => (
            <Link key={m.slug} href={`/start/${m.slug}`} className="card flex flex-col p-5 transition hover:shadow-lift">
              <div className="text-2xl" aria-hidden>{m.emoji}</div>
              <h3 className="mt-2 font-semibold text-ink">{m.name}</h3>
              {m.tagline && <p className="mt-1 flex-1 text-sm leading-relaxed text-slate2">{m.tagline}</p>}
              <span className="mt-3 text-sm font-semibold text-ai">Start →</span>
            </Link>
          ))}
        </div>
      )}

      <Footer />
    </main>
  );
}
