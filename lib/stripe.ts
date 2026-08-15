import Stripe from "stripe";

// Payments are OFF until BOTH a secret key and a price ID are configured.
// This keeps the app fully usable before you set up Stripe.
export const PAYMENTS_ENABLED = !!(
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID
);

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
