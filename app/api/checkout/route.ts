import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED } from "@/lib/stripe";

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
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const origin =
    headers().get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: { user_id: user.id },
      allow_promotion_codes: true, // lets you comp students with a 100%-off code
      success_url: `${origin}/paywall?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paywall?canceled=1`,
    });
    return Response.json({ url: session.url });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Could not start checkout." },
      { status: 500 }
    );
  }
}
