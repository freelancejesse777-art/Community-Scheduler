import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "../../../../lib/session";
import { getRedditAuthUrl } from "../../../../lib/reddit";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import db from "../../../../lib/db";

export async function GET(req) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!isPro(user.userId)) {
    const count = db
      .prepare("SELECT COUNT(*) as c FROM connections WHERE user_id = ?")
      .get(user.userId).c;
    if (count >= FREE_PLAN_LIMITS.maxConnections) {
      return NextResponse.redirect(
        new URL("/billing?error=Free plan connection limit reached", req.url)
      );
    }
  }

  // state ties the callback back to this logged-in user
  const state = Buffer.from(
    JSON.stringify({ userId: user.userId, nonce: crypto.randomUUID() })
  ).toString("base64url");

  const url = getRedditAuthUrl(state);
  return NextResponse.redirect(url);
}
