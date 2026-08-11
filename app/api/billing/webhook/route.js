import { NextResponse } from "next/server";
import { stripe, upsertSubscriptionFromStripeEvent } from "../../../../lib/billing";
import db from "../../../../lib/db";

// Stripe requires the raw request body to verify the webhook signature —
// Next.js App Router gives us the raw text via req.text().
export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = Number(session.metadata.userId);
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      upsertSubscriptionFromStripeEvent({
        userId,
        stripeSubscriptionId: subscription.id,
        plan: "pro",
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const row = db
        .prepare("SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?")
        .get(subscription.id);
      if (row) {
        upsertSubscriptionFromStripeEvent({
          userId: row.user_id,
          stripeSubscriptionId: subscription.id,
          plan: subscription.status === "active" ? "pro" : "free",
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
