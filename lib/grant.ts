import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PACK_RUNS } from "@/lib/access";

// Add a pack of runs to the wallet for a completed checkout. Idempotent — one
// credit grant per checkout session (the webhook and the success-redirect both
// call this). A 100%-off coupon still "completes" at $0, so a free code grants a
// pack too. Called from the webhook and the success-redirect fallback.
export async function grantFromSession(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) return;
  if (session.payment_status !== "paid" && session.status !== "complete") return;

  const admin = createAdminClient();
  // One credit grant per session id.
  const { data: existing } = await admin.from("run_credits").select("id").eq("ref", session.id).maybeSingle();
  if (existing) return;

  await admin.from("run_credits").insert({
    user_id: userId,
    delta: PACK_RUNS,
    reason: "purchase",
    ref: session.id,
  });
}

// Claw back a pack when a purchase is fully refunded. Matches the credit grant to
// the refunded checkout session (so refunding an OLD purchase doesn't touch a
// later one) and posts an offsetting negative entry. Idempotent per session.
export async function revokeFromCharge(charge: any) {
  if (!charge?.refunded) return; // only act on a FULL refund
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;

  let sessionId: string | undefined;
  let userId: string | undefined;
  try {
    const list = await getStripe().checkout.sessions.list({ payment_intent: pi, limit: 1 });
    const s = list.data[0];
    sessionId = s?.id;
    userId = s?.client_reference_id || (s?.metadata?.user_id as string | undefined);
  } catch {
    /* fall through */
  }
  if (!sessionId && !userId) return;

  const admin = createAdminClient();
  // Find the original purchase grant (by session), and skip if already refunded.
  const ref = sessionId ? `refund:${sessionId}` : `refund:user:${userId}`;
  const { data: already } = await admin.from("run_credits").select("id").eq("ref", ref).maybeSingle();
  if (already) return;

  let delta = -PACK_RUNS;
  if (sessionId) {
    const { data: orig } = await admin.from("run_credits").select("delta, user_id").eq("ref", sessionId).maybeSingle();
    if (orig) { delta = -Math.abs((orig as any).delta || PACK_RUNS); userId = userId || (orig as any).user_id; }
  }
  if (!userId) return; // run_credits.user_id is NOT NULL — need a user to post the refund
  await admin.from("run_credits").insert({ user_id: userId, delta, reason: "refund", ref });
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
