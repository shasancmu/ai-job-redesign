import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { grantFromSession, syncSubscription, revokeFromCharge } from "@/lib/grant";

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

  switch (event.type) {
    case "checkout.session.completed":
      await grantFromSession(event.data.object as Stripe.Checkout.Session);
      break;
    // A full refund revokes all-access.
    case "charge.refunded":
      await revokeFromCharge(event.data.object as any);
      break;
    // Renewal / cancellation of the $29/yr plan — refresh or lapse the period.
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid": {
      const inv = event.data.object as any; // subscription field varies by API version
      const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
      if (subId) await syncSubscription(await getStripe().subscriptions.retrieve(subId));
      break;
    }
  }

  return Response.json({ received: true });
}
