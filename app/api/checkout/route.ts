import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PAYMENTS_ENABLED } from "@/lib/stripe";
import { priceIdFor } from "@/lib/modules";

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

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* no body — default to all-access */
  }

  // What are they buying? A module slug, or "all" (the bundle).
  let target = String(body.module || "all");
  let priceId = priceIdFor(target);
  // If a module has no individual price configured, sell the bundle instead.
  if (!priceId && target !== "all") {
    target = "all";
    priceId = priceIdFor("all");
  }
  if (!priceId) {
    return Response.json({ error: "No price configured." }, { status: 400 });
  }

  const origin =
    headers().get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: { user_id: user.id, module: target },
      allow_promotion_codes: true, // lets you comp students with a 100%-off code
      success_url: `${origin}/paywall?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paywall?module=${encodeURIComponent(target)}&canceled=1`,
    });
    return Response.json({ url: session.url });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Could not start checkout." },
      { status: 500 }
    );
  }
}
