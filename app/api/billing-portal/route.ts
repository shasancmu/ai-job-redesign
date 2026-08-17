import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens the Stripe billing portal so a subscriber can update their card or
// cancel the $29/yr plan themselves.
export async function POST(request: Request) {
  if (!PAYMENTS_ENABLED) return Response.json({ error: "Payments are not configured." }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const stripe = getStripe();

  // Find this user's Stripe customer id: stored on the entitlement, else derived
  // from their subscription, else looked up by email.
  const { data: ent } = await supabase
    .from("entitlements")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("module", "all")
    .maybeSingle();

  let customer = (ent as any)?.stripe_customer_id as string | undefined;
  try {
    if (!customer && (ent as any)?.stripe_subscription_id) {
      const sub: any = await stripe.subscriptions.retrieve((ent as any).stripe_subscription_id);
      customer = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    }
    if (!customer && user.email) {
      const list = await stripe.customers.list({ email: user.email, limit: 1 });
      customer = list.data[0]?.id;
    }
  } catch {
    /* fall through to the error below */
  }
  if (!customer) return Response.json({ error: "No subscription found to manage." }, { status: 404 });

  const origin = headers().get("origin") || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${origin}/profile`,
    });
    return Response.json({ url: portal.url });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't open the billing portal." }, { status: 500 });
  }
}
