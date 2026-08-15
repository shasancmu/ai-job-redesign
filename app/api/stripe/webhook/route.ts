import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { grantFromSession } from "@/lib/grant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get("stripe-signature");
  if (!secret || !sig) {
    return new Response("Webhook not configured.", { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    return new Response(`Webhook signature verification failed: ${e?.message}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    await grantFromSession(event.data.object as Stripe.Checkout.Session);
  }

  return Response.json({ received: true });
}
