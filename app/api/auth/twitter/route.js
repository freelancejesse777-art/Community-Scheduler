import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "../../../../lib/session";
import { generatePkcePair, getTwitterAuthUrl } from "../../../../lib/twitter";
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

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = crypto.randomUUID();

  db.prepare(
    `INSERT INTO oauth_pkce_state (state, code_verifier, user_id, provider, expires_at)
     VALUES (?, ?, ?, 'twitter', ?)`
  ).run(state, codeVerifier, user.userId, Date.now() + 10 * 60 * 1000);

  const url = getTwitterAuthUrl(state, codeChallenge);
  return NextResponse.redirect(url);
}
