import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED } from "@/lib/stripe";
import { hasAccess } from "@/lib/entitlement";
import { grantFromSession } from "@/lib/grant";
import PayButton from "@/components/PayButton";

function formatPrice(amount: number | null, currency: string | null) {
  if (amount == null || !currency) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export default async function Paywall({
  searchParams,
}: {
  searchParams: { session_id?: string; canceled?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Payments not set up → nothing to gate; send them in.
  if (!PAYMENTS_ENABLED) redirect("/dashboard");

  // Returning from a successful checkout: verify and grant immediately
  // (the webhook is the reliable backstop, this just makes access instant).
  if (searchParams.session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(
        searchParams.session_id
      );
      if (
        session.payment_status === "paid" &&
        (session.client_reference_id === user.id ||
          session.metadata?.user_id === user.id)
      ) {
        await grantFromSession(session);
      }
    } catch {
      // fall through — they'll see the pay screen and can retry
    }
  }

  if (await hasAccess(supabase, user.id)) redirect("/dashboard");

  // Fetch the price to show the amount.
  let priceLabel: string | null = null;
  try {
    const price = await getStripe().prices.retrieve(process.env.STRIPE_PRICE_ID!);
    priceLabel = formatPrice(price.unit_amount ?? null, price.currency ?? null);
  } catch {
    priceLabel = null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        One step left
      </div>
      <h1 className="text-2xl font-bold">Unlock the exercise</h1>
      <p className="mt-2 text-slate-500">
        A one-time payment gives you full access to Reimagine Your Job — open
        rooms, run the exercise, and keep your redesigns.
      </p>

      <div className="card mt-6 p-6">
        {priceLabel && (
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{priceLabel}</span>
            <span className="text-slate-400">one-time</span>
          </div>
        )}

        {searchParams.canceled && (
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Checkout was canceled — you can try again whenever you&apos;re ready.
          </div>
        )}

        <PayButton label={priceLabel ? `Pay ${priceLabel} & unlock` : "Pay & unlock"} />

        <p className="mt-3 text-center text-xs text-slate-400">
          Secure payment by Stripe. Have a code? You can enter it at checkout.
        </p>
      </div>

      <form action="/auth/signout" method="post" className="mt-6 text-center">
        <button className="text-sm text-slate-400 hover:text-slate-600">
          Sign out
        </button>
      </form>
    </main>
  );
}
