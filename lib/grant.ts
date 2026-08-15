import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Grant access for a completed/paid checkout session. Idempotent — safe to run
// from both the webhook and the success redirect.
export async function grantFromSession(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) return;
  if (session.payment_status !== "paid") return;

  const admin = createAdminClient();
  await admin.from("entitlements").upsert(
    {
      user_id: userId,
      paid: true,
      stripe_session_id: session.id,
      amount_total: session.amount_total ?? null,
      currency: session.currency ?? null,
    },
    { onConflict: "user_id" }
  );
}
