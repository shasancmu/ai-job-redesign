import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Grant access for a completed/paid checkout session. Idempotent.
// The purchased target (a module slug or "all") comes from session metadata,
// defaulting to "all" so a single-price checkout still grants everything.
export async function grantFromSession(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) return;
  if (session.payment_status !== "paid") return;

  const moduleTarget = session.metadata?.module || "all";

  const admin = createAdminClient();
  await admin.from("entitlements").upsert(
    {
      user_id: userId,
      module: moduleTarget,
      paid: true,
      stripe_session_id: session.id,
      amount_total: session.amount_total ?? null,
      currency: session.currency ?? null,
    },
    { onConflict: "user_id,module" }
  );
}
