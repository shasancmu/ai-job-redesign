import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED, PRICE_ALL, PRICE_COHORT } from "@/lib/stripe";
import { grantFromSession } from "@/lib/grant";
import { alumniOffer, runWallet, PACK_RUNS } from "@/lib/access";
import { moduleBySlug, MODULES } from "@/lib/modules";
import { createAdminClient } from "@/lib/supabase/admin";
import { viewAsTarget } from "@/lib/viewAs";
import ViewAsBanner from "@/components/ViewAsBanner";
import PayButton from "@/components/PayButton";

// Human label for a Stripe price, e.g. "$29".
async function priceLabel(priceId: string | undefined, fallback: string): Promise<string> {
  if (!priceId) return fallback;
  try {
    const p = await getStripe().prices.retrieve(priceId);
    if (p.unit_amount != null && p.currency) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency.toUpperCase(), minimumFractionDigits: 0 }).format(p.unit_amount / 100);
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
  const rls = createClient();
  const { data: { user: realUser } } = await rls.auth.getUser();
  if (!realUser) redirect("/login");
  if (!PAYMENTS_ENABLED) redirect("/dashboard");

  // Superadmin "view as" — read lens (see the target's runs balance/packs).
  const proxy = await viewAsTarget(realUser);
  const isProxy = !!proxy;
  const user: any = isProxy ? { id: proxy!.id, email: proxy!.email } : realUser;
  const supabase: any = isProxy ? createAdminClient() : rls;

  // Returning from a successful checkout: verify + add the runs, then continue.
  // (Never while proxying — a superadmin viewing shouldn't grant anyone runs.)
  if (searchParams.session_id && !isProxy) {
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

  const mod = searchParams.module ? moduleBySlug(searchParams.module) : null;
  const wallet = await runWallet(supabase, user.id);
  const left = Math.max(0, wallet.balance);
  const outOfRuns = left <= 0;
  const offer = await alumniOffer(supabase, user.id);
  const alumniPrice = offer.active && !!PRICE_COHORT;

  const allLabel = await priceLabel(PRICE_ALL, "$29");
  const cohortLabel = await priceLabel(PRICE_COHORT, "$19");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      {isProxy && <ViewAsBanner email={proxy!.email} />}
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-sage">Runs</div>
      <h1 className="text-2xl font-bold text-ink">
        {outOfRuns ? (mod ? "You're out of runs" : "Get more runs") : "Top up your runs"}
      </h1>
      <p className="mt-2 text-slate-500">
        {outOfRuns
          ? mod
            ? `You've used all your runs. Add a pack to run ${mod.name} — or any of the ${MODULES.length} exercises.`
            : `Add a pack of runs. One run = one exercise, and you spend them on anything you like.`
          : `You have ${left} run${left === 1 ? "" : "s"} left. Grab more now so you never hit a wall mid-flow.`}
      </p>

      <ul className="mt-4 space-y-1.5 text-sm text-slate2">
        <li className="flex gap-2"><span className="text-sage">✓</span> Spend on any of the {MODULES.length} exercises</li>
        <li className="flex gap-2"><span className="text-sage">✓</span> Runs never expire — use them whenever</li>
        <li className="flex gap-2"><span className="text-sage">✓</span> Always free through your school or company</li>
      </ul>

      {searchParams.canceled && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Checkout was canceled. You can come back whenever you&apos;re ready.
        </div>
      )}

      {/* Alumni pack — same runs, lower price, only while the window is open. */}
      {alumniPrice && (
        <div className="card mt-6 border-2 border-ink p-6">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{cohortLabel}</span>
            <span className="text-slate-400">{PACK_RUNS} runs · cohort alumni price</span>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            You&apos;ve been through a cohort — your lowest per-run price.{" "}
            <span className="font-semibold text-clay">Ends in {offer.daysLeft} day{offer.daysLeft === 1 ? "" : "s"}.</span>
          </p>
          <PayButton plan="cohort" label={`Get ${PACK_RUNS} runs`} />
        </div>
      )}

      {/* Public pack. */}
      <div className={"card mt-4 p-6 " + (alumniPrice ? "" : "border-2 border-ink")}>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{allLabel}</span>
          <span className="text-slate-400">{PACK_RUNS} runs · about 50¢ a run</span>
        </div>
        <p className="mb-3 text-sm text-slate-500">Enough to work through a whole stretch of exercises. Yours until you use them.</p>
        <PayButton plan="all" label={`Get ${PACK_RUNS} runs`} />
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Secure payment by Stripe. Have a code? Enter it at checkout — runs never expire.
      </p>

      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">← Back</Link>
        <form action="/auth/signout" method="post">
          <button className="text-slate-400 hover:text-slate-600">Sign out</button>
        </form>
      </div>
    </main>
  );
}
