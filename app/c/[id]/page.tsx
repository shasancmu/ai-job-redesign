import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";
import { describeCredential, linkedInAddUrl } from "@/lib/credentials";
import Logo from "@/components/Logo";
import CredentialCard from "@/components/CredentialCard";
import CredentialActions from "@/components/CredentialActions";

export const dynamic = "force-dynamic";

// Looks like a UUID? (guards against garbage ids hitting the DB)
const isId = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function load(id: string) {
  // A permanent example credential — handy to link from marketing, and it lets
  // the page render without a real row behind it.
  if (id === "sample") {
    return {
      cred: {
        id: "sample",
        user_id: "",
        kind: "track",
        ckey: "strategist",
        title: "The Strategist",
        earned_at: "2026-08-15T00:00:00.000Z",
      },
      holder: "Alex Morgan",
    };
  }
  if (!isId(id)) return null;
  try {
    const admin = createAdminClient();
    const { data: cred } = await admin
      .from("credentials")
      .select("id,user_id,kind,ckey,title,earned_at")
      .eq("id", id)
      .maybeSingle();
    if (!cred) return null;
    const { data: prof } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", (cred as any).user_id)
      .maybeSingle();
    const holder = (prof as any)?.display_name || "A Superadditive member";
    return { cred: cred as any, holder };
  } catch {
    return null; // missing service key / DB hiccup → 404, not a 500
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const data = await load(params.id);
  if (!data) return { title: "Credential" };
  const view = describeCredential(data.cred.kind, data.cred.ckey, data.cred.title);
  const title = `${data.holder} · ${view.title}`;
  return {
    title,
    description: view.line,
    openGraph: { title, description: view.line, type: "website" },
    twitter: { card: "summary_large_image", title, description: view.line },
  };
}

function fullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function CredentialPage({ params }: { params: { id: string } }) {
  const data = await load(params.id);
  if (!data) notFound();
  const { cred, holder } = data;
  const view = describeCredential(cred.kind, cred.ckey, cred.title);

  const shareUrl = `${BRAND.siteUrl}/c/${cred.id}`;
  const d = cred.earned_at ? new Date(cred.earned_at) : null;
  const linkedinUrl = linkedInAddUrl({
    name: view.title,
    certUrl: shareUrl,
    certId: cred.id,
    year: d ? d.getFullYear() : undefined,
    month: d ? d.getMonth() + 1 : undefined,
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <CredentialCard
        eyebrow={view.eyebrow}
        title={view.title}
        line={view.line}
        holder={holder}
        dateLabel={fullDate(cred.earned_at)}
        variant="full"
        contents={view.contents}
        credId={cred.id.slice(0, 8).toUpperCase()}
      />

      <CredentialActions linkedinUrl={linkedinUrl} shareUrl={shareUrl} />

      {/* Viral loop: a visitor who lands here is a prospect. */}
      <div className="mt-12 rounded-2xl border border-line bg-mist/50 p-6 text-center">
        <div className="text-sm font-semibold text-ink">Earn your own</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          {BRAND.name} runs short, real exercises on AI, strategy, and your career. Finish one and
          earn a credential like this.
        </p>
        <Link href="/try" className="btn-primary mt-4 inline-block">
          Get your 90-second read
        </Link>
      </div>
    </main>
  );
}
