import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED, PRICE_ALL, PRICE_COHORT } from "@/lib/stripe";
import { grantFromSession } from "@/lib/grant";
import { activeEntitlements, cohortAlumnus, FREE_TIER_MODULES, PAID_RUNS } from "@/lib/access";
import { moduleBySlug, MODULES } from "@/lib/modules";
import PayButton from "@/components/PayButton";

// Human label for a Stripe price, e.g. "$29 / year" or "$19".
async function priceLabel(priceId: string | undefined, fallback: string): Promise<string> {
  if (!priceId) return fallback;
  try {
    const p = await getStripe().prices.retrieve(priceId);
    if (p.unit_amount != null && p.currency) {
      const amt = new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency.toUpperCase(), minimumFractionDigits: 0 }).format(p.unit_amount / 100);
      const interval = p.recurring?.interval;
      return interval ? `${amt} / ${interval}` : amt;
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

export default async function Paywall({
  searchParams,
}: {
  searchParams: { session_id?: string; canceled?: string; module?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!PAYMENTS_ENABLED) redirect("/dashboard");

  // Returning from a successful checkout: verify + grant, then continue.
  if (searchParams.session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(searchParams.session_id);
      if (
        (session.payment_status === "paid" || session.status === "complete") &&
        (session.client_reference_id === user.id || session.metadata?.user_id === user.id)
      ) {
        await grantFromSession(session);
      }
    } catch {
      /* fall through */
    }
    redirect("/dashboard");
  }

  // Already have all-access → nothing to buy.
  const ents = await activeEntitlements(supabase, user.id);
  if (ents.has("all")) redirect("/dashboard");

  const mod = searchParams.module ? moduleBySlug(searchParams.module) : null;
  const isFreeTierModule = mod ? FREE_TIER_MODULES.has(mod.slug) : false;
  const alumnus = await cohortAlumnus(supabase, user.id);

  const allLabel = await priceLabel(PRICE_ALL, "$29");
  const cohortLabel = await priceLabel(PRICE_COHORT, "$19");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Keep going</div>
      <h1 className="text-2xl font-bold">{mod ? mod.name : "Unlock full access"}</h1>
      <p className="mt-2 text-slate-500">
        {isFreeTierModule
          ? `You've used your free runs of ${mod!.name}. Get full access to keep going — and to run every other module.`
          : mod
            ? `${mod.name} is part of full access — every module, ${PAID_RUNS} runs each.`
            : `Every one of the ${MODULES.length} modules, ${PAID_RUNS} runs each.`}
      </p>

      {searchParams.canceled && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Checkout was canceled — you can try again whenever you&apos;re ready.
        </div>
      )}

      {/* $19 cohort-alumni price (only if eligible + configured) */}
      {alumnus && PRICE_COHORT && (
        <div className="card mt-6 border-2 border-ink p-6">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{cohortLabel}</span>
            <span className="text-slate-400">one-time · you were in a cohort</span>
          </div>
          <p className="mb-3 text-sm text-slate-500">Alumni price — every module, {PAID_RUNS} runs each.</p>
          <PayButton plan="cohort" label="Unlock all modules" />
        </div>
      )}

      {/* $29 one-time public plan */}
      <div className={"card mt-4 p-6 " + (alumnus && PRICE_COHORT ? "" : "border-2 border-ink")}>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{allLabel}</span>
          <span className="text-slate-400">one-time · all {MODULES.length} modules</span>
        </div>
        <p className="mb-3 text-sm text-slate-500">Every current module — and everything added later, {PAID_RUNS} runs each.</p>
        <PayButton plan="all" label="Get full access" />
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">Secure payment by Stripe. Have a code? Enter it at checkout.</p>

      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">← Back</Link>
        <form action="/auth/signout" method="post">
          <button className="text-slate-400 hover:text-slate-600">Sign out</button>
        </form>
      </div>
    </main>
  );
}
