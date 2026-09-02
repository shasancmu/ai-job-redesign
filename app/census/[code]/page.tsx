import Logo from "@/components/Logo";
import { createAdminClient } from "@/lib/supabase/admin";
import BusinessProfileFlow from "@/components/BusinessProfileFlow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no sign-in: a respondent completes a business profile. A ?firm=CODE
// link attaches the response as a new wave of an existing business.
export const metadata = { title: "Business census" };

export default async function CensusJoin({ params, searchParams }: { params: { code: string }; searchParams: { firm?: string } }) {
  const code = String(params.code || "").toUpperCase();
  const firmCode = String(searchParams.firm || "").toUpperCase();

  let exists = false;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("business_campaigns").select("id").eq("code", code).maybeSingle();
    exists = !!data;
  } catch { exists = false; }

  if (!exists) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-ink">Link not found</h1>
        <p className="mt-2 text-sm text-slate2">Check the link and try again.</p>
      </main>
    );
  }

  return <BusinessProfileFlow code={code} firmCode={firmCode || undefined} />;
}
