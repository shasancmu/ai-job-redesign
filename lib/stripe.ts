import Stripe from "stripe";

// Payments are DISABLED for now (pending a redesign). Everything is free.
// To bring payments back later, restore:
//   !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
export const PAYMENTS_ENABLED = false;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}
