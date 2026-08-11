// lib/twitter.js
// X's API moved to pay-per-use pricing in Feb 2026 — no free tier, but no
// $200/month minimum either. Roughly $0.015 per post (more with a link).
// You load credits into your X developer account and get billed per call.
// Posting uses OAuth 2.0 with PKCE (required by X, unlike Reddit's flow).

const crypto = require("crypto");

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI;

function generatePkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

function getTwitterAuthUrl(state, codeChallenge) {
  const scopes = ["tweet.read", "tweet.write", "users.read", "offline.access"];
  const params = new URLSearchParams({
    response_type: "code",
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_REDIRECT_URI,
    scope: scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

async function exchangeTwitterCode(code, codeVerifier) {
  const basicAuth = Buffer.from(
    `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: TWITTER_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error(`X token exchange failed: ${await res.text()}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

async function refreshTwitterToken(refreshToken) {
  const basicAuth = Buffer.from(
    `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`X token refresh failed: ${await res.text()}`);
  }
  return res.json();
}

async function postTweet(accessToken, content) {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: content }),
  });

  if (!res.ok) {
    throw new Error(`Tweet failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

module.exports = {
  generatePkcePair,
  getTwitterAuthUrl,
  exchangeTwitterCode,
  refreshTwitterToken,
  postTweet,
};
