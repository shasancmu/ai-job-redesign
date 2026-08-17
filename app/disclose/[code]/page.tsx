import { createAdminClient } from "@/lib/supabase/admin";
import { domainsFor, variantForExercise } from "@/lib/disclosure";
import DisclosureForm from "@/components/DisclosureForm";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// PUBLIC, no-auth page: a vendor completes a disclosure via the link the buyer
// shared. Read/write goes through the service-role client, keyed by the session
// code (the link token) — never RLS-exposed.
export default async function DisclosePage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  let session: any = null;
  let workspace: any = null;
  try {
    const admin = createAdminClient();
    const { data: s } = await admin.from("sessions").select("id, code, exercise").eq("code", code).maybeSingle();
    session = s;
    if (session) {
      const { data: w } = await admin.from("workspaces").select("id, canvas").eq("session_id", session.id).limit(1).maybeSingle();
      workspace = w;
    }
  } catch {
    /* service role not set */
  }

  const isDisclosure = session && (session.exercise === "disclosure" || session.exercise === "disclosure-haip");
  if (!isDisclosure) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold text-ink">This link isn&apos;t valid</h1>
        <p className="mt-2 text-slate2">Ask whoever sent it for a fresh disclosure link.</p>
      </main>
    );
  }

  const canvas = (workspace?.canvas as any) || {};
  const variant = variantForExercise(session.exercise);
  const isAi = variant === "haip" ? true : !!canvas.isAi;
  const domains = domainsFor(variant, isAi);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6"><Logo /></div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor disclosure request</div>
      <h1 className="mt-1 text-2xl font-bold text-ink">{canvas.product || canvas.vendor || "Complete this disclosure"}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        {variant === "haip"
          ? "You've been asked to complete the Health AI Partnership (HAIP) AI Vendor Disclosure Framework. Answer each question as completely and specifically as you can — the buyer will review your responses against the framework."
          : "You've been asked to complete a vendor disclosure (adapted from the Health AI Partnership framework). Answer each question as completely and specifically as you can."}
      </p>

      <DisclosureForm
        code={code}
        domains={domains}
        initial={(canvas.responses as any) || {}}
        alreadySubmitted={!!canvas.submittedAt}
      />
    </main>
  );
}
