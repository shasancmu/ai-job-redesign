import Stripe from "stripe";

// Payments turn on automatically once Stripe is configured. Until STRIPE_SECRET_KEY
// is set, every module is free and unlimited (paywall + run caps stay dormant).
export const PAYMENTS_ENABLED = !!process.env.STRIPE_SECRET_KEY;

// Price IDs for the two all-access plans (set in the Stripe dashboard):
//   STRIPE_PRICE_ALL    — $29/year recurring (public)
//   STRIPE_PRICE_COHORT — $19 one-time (cohort alumni)
export const PRICE_ALL = process.env.STRIPE_PRICE_ALL || process.env.STRIPE_PRICE_ID; // back-compat
export const PRICE_COHORT = process.env.STRIPE_PRICE_COHORT;

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
