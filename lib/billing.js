// lib/billing.js
const Stripe = require("stripe");
const db = require("./db");

// Built the same way as lib/db.js's fix: don't construct the Stripe
// client eagerly at module import time. Next.js's build step ("collecting
// page data") loads every route file — including this one, transitively —
// just to inspect it, without real production env vars necessarily
// available yet. Constructing `new Stripe(...)` right at the top of this
// file baked in whatever STRIPE_SECRET_KEY (or its "sk_test_placeholder"
// fallback) happened to be present at that moment, and that stale client
// then got reused at actual runtime instead of picking up the real key.
// Deferring construction until the first real call (which only ever
// happens inside a request handler, never during the build) fixes it.
let stripeClient = null;
function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");
  }
  return stripeClient;
}

function getOrCreateSubscriptionRow(userId) {
  let row = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(userId);
  if (!row) {
    db.prepare("INSERT INTO subscriptions (user_id, plan, status) VALUES (?, 'free', 'active')").run(userId);
    row = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(userId);
  }
  return row;
}

// Free plan limits — enforced in API routes that create connections/scheduled posts
const FREE_PLAN_LIMITS = {
  maxConnections: 1,
  maxScheduledPostsPerMonth: 5,
};

function isPro(userId) {
  const row = getOrCreateSubscriptionRow(userId);
  return row.plan === "pro" && row.status === "active";
}

async function createCheckoutSession(user, successUrl, cancelUrl) {
  const sub = getOrCreateSubscriptionRow(user.userId);
  const stripe = getStripeClient();

  let customerId = sub.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    db.prepare("UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?").run(
      customerId,
      user.userId
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(user.userId) },
    // Shown on Stripe's own post-payment confirmation screen, before the
    // redirect back to success_url — a good spot for a thank-you + link
    // since it's the very first thing someone sees after paying.
    custom_text: {
      after_submit: {
        message:
          "You're on Pro! Head back to your dashboard any time: https://community-scheduler-production.up.railway.app/dashboard",
      },
    },
  });

  return session;
}

// Called from the Stripe webhook handler on subscription events
function upsertSubscriptionFromStripeEvent({ userId, stripeSubscriptionId, plan, status, currentPeriodEnd }) {
  db.prepare(
    `UPDATE subscriptions
     SET stripe_subscription_id = ?, plan = ?, status = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`
  ).run(stripeSubscriptionId, plan, status, currentPeriodEnd, userId);
}

module.exports = {
  getStripeClient,
  getOrCreateSubscriptionRow,
  isPro,
  createCheckoutSession,
  upsertSubscriptionFromStripeEvent,
  FREE_PLAN_LIMITS,
};
