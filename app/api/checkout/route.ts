import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED, PRICE_ALL, PRICE_COHORT } from "@/lib/stripe";
import { cohortAlumnus } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!PAYMENTS_ENABLED) {
    return Response.json({ error: "Payments are not configured." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* default below */
  }

  // Two ONE-TIME plans (no subscriptions): "all" = $29 (public), "cohort" = $19
  // (only for people who've been in a cohort). Each buys fixed runs of every
  // exercise. Fall back to "all" if a $19 is requested but they're not eligible
  // or it isn't configured.
  let plan: "all" | "cohort" = body.plan === "cohort" ? "cohort" : "all";
  if (plan === "cohort" && (!PRICE_COHORT || !(await cohortAlumnus(supabase, user.id)))) {
    plan = "all";
  }
  const priceId = plan === "cohort" ? PRICE_COHORT : PRICE_ALL;
  if (!priceId) return Response.json({ error: "No price configured." }, { status: 400 });

  const origin =
    headers().get("origin") || process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // one-time — $29 (or $19 alumni), fixed runs of every exercise
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: { user_id: user.id, plan, module: "all" },
      // A 100%-off coupon makes a one-time total $0 → Stripe collects no card, so
      // a code holder joins free with no payment details.
      allow_promotion_codes: true,
      success_url: `${origin}/paywall?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paywall?canceled=1`,
    });
    return Response.json({ url: session.url });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Could not start checkout." }, { status: 500 });
  }
}
