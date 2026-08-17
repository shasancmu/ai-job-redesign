import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Grant "all"-access for a completed checkout. Idempotent. A subscription
// ($29/yr) carries its period so paid runs refresh on renewal; a one-time $19
// grant is lifetime (no period end). Called from the webhook and the
// success-redirect fallback.
export async function grantFromSession(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) return;
  if (session.payment_status !== "paid" && session.status !== "complete") return;

  const admin = createAdminClient();
  const base: any = {
    user_id: userId,
    module: "all",
    paid: true,
    stripe_session_id: session.id,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? null,
  };

  if (session.mode === "subscription" && session.subscription) {
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    try {
      const sub: any = await getStripe().subscriptions.retrieve(subId);
      base.stripe_subscription_id = sub.id;
      base.current_period_start = new Date((sub.current_period_start || 0) * 1000).toISOString();
      base.current_period_end = new Date((sub.current_period_end || 0) * 1000).toISOString();
    } catch {
      base.stripe_subscription_id = subId;
      base.current_period_start = new Date().toISOString();
    }
  } else {
    // One-time $19: lifetime grant. Runs count from purchase.
    base.current_period_start = new Date().toISOString();
    base.current_period_end = null;
  }

  await admin.from("entitlements").upsert(base, { onConflict: "user_id,module" });
}

// Sync an entitlement from a subscription lifecycle event (renewal, cancel).
export async function syncSubscription(sub: any) {
  const userId = (sub.metadata?.user_id as string) || null;
  const admin = createAdminClient();

  // Find the entitlement by subscription id (metadata user_id may be absent).
  const { data: rows } = await admin
    .from("entitlements")
    .select("user_id")
    .eq("stripe_subscription_id", sub.id)
    .limit(1);
  const uid = userId || rows?.[0]?.user_id;
  if (!uid) return;

  if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
    // Let it lapse at period end by setting the end; access checks drop expired.
    await admin
      .from("entitlements")
      .update({ current_period_end: new Date((sub.current_period_end || 0) * 1000).toISOString() })
      .eq("user_id", uid)
      .eq("module", "all");
    return;
  }

  await admin
    .from("entitlements")
    .update({
      current_period_start: new Date((sub.current_period_start || 0) * 1000).toISOString(),
      current_period_end: new Date((sub.current_period_end || 0) * 1000).toISOString(),
      stripe_subscription_id: sub.id,
    })
    .eq("user_id", uid)
    .eq("module", "all");
}
