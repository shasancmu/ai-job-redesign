import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED } from "@/lib/stripe";
import { hasModuleAccess } from "@/lib/entitlement";
import { isAdmin } from "@/lib/admin";
import { grantFromSession } from "@/lib/grant";
import { MODULES, ALL_ACCESS, moduleBySlug, priceIdFor, formatPrice } from "@/lib/modules";
import PayButton from "@/components/PayButton";

async function priceLabel(priceId: string | undefined, fallbackCents: number) {
  if (!priceId) return formatPrice(fallbackCents);
  try {
    const p = await getStripe().prices.retrieve(priceId);
    if (p.unit_amount != null && p.currency) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: p.currency.toUpperCase(),
      }).format(p.unit_amount / 100);
    }
  } catch {
    /* fall through */
  }
  return formatPrice(fallbackCents);
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
        session.payment_status === "paid" &&
        (session.client_reference_id === user.id || session.metadata?.user_id === user.id)
      ) {
        await grantFromSession(session);
      }
    } catch {
      /* fall through to pay screen */
    }
    redirect("/dashboard");
  }

  const slug = searchParams.module && moduleBySlug(searchParams.module) ? searchParams.module : "all";
  const mod = slug === "all" ? null : moduleBySlug(slug)!;
  const instructor = isAdmin(user.email);

  if (mod && (await hasModuleAccess(supabase, user.id, mod.slug, instructor))) {
    redirect("/dashboard");
  }

  const modulePrice = mod ? priceIdFor(mod.slug) : undefined;
  const moduleLabel = mod ? await priceLabel(modulePrice, mod.priceCents) : null;
  const allLabel = await priceLabel(priceIdFor("all"), ALL_ACCESS.priceCents);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Unlock to continue
      </div>
      <h1 className="text-2xl font-bold">
        {mod ? mod.name : "Get the full toolkit"}
      </h1>
      <p className="mt-2 text-slate-500">
        {mod
          ? mod.description
          : "One payment unlocks every module — no subscription."}
      </p>

      {searchParams.canceled && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Checkout was canceled — you can try again whenever you&apos;re ready.
        </div>
      )}

      {/* Buy this module (only if it has an individual price configured) */}
      {mod && modulePrice && (
        <div className="card mt-6 p-6">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{moduleLabel}</span>
            <span className="text-slate-400">one-time · this module</span>
          </div>
          <PayButton module={mod.slug} label={`Unlock ${mod.name}`} />
        </div>
      )}

      {/* All-access bundle */}
      <div className="card mt-4 border-2 border-ink p-6">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{allLabel}</span>
          <span className="text-slate-400">one-time · all {MODULES.length} modules</span>
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Every current module — and everything added later.
        </p>
        <PayButton module="all" label="Get all modules" />
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Secure payment by Stripe. Have a code? Enter it at checkout.
      </p>

      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
          ← Back
        </Link>
        <form action="/auth/signout" method="post">
          <button className="text-slate-400 hover:text-slate-600">Sign out</button>
        </form>
      </div>
    </main>
  );
}
