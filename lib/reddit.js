// lib/reddit.js
const snoowrap = require("snoowrap");

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_REDIRECT_URI = process.env.REDDIT_REDIRECT_URI;

// Step 1: build the URL the user is sent to on Reddit to approve access
function getRedditAuthUrl(state) {
  const scopes = ["identity", "submit", "read"];
  const params = new URLSearchParams({
    client_id: REDDIT_CLIENT_ID,
    response_type: "code",
    state,
    redirect_uri: REDDIT_REDIRECT_URI,
    duration: "permanent",
    scope: scopes.join(" "),
  });
  return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
}

// Step 2: exchange the ?code= Reddit sends back for real tokens
async function exchangeRedditCode(code) {
  const basicAuth = Buffer.from(
    `${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "community-scheduler/0.1 by yourusername",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDDIT_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`Reddit token exchange failed: ${await res.text()}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

// Build an authenticated snoowrap client for a stored connection
function getRedditClient(connection) {
  return new snoowrap({
    userAgent: "community-scheduler/0.1 by yourusername",
    clientId: REDDIT_CLIENT_ID,
    clientSecret: REDDIT_CLIENT_SECRET,
    refreshToken: connection.refresh_token,
  });
}

async function submitToSubreddit(connection, subreddit, title, body) {
  const client = getRedditClient(connection);
  const submission = await client
    .getSubreddit(subreddit)
    .submitSelfpost({ title, text: body });
  // Fetch once so id/permalink are populated (submitSelfpost's return value
  // is a lazily-loaded proxy — reading fields off it directly can be empty).
  return submission.fetch();
}

// Used by the analytics/engagement refresh — pulls current score + comment
// count for a post we already submitted.
async function getSubmissionStats(connection, submissionId) {
  const client = getRedditClient(connection);
  const submission = await client.getSubmission(submissionId).fetch();
  return {
    score: submission.score,
    numComments: submission.num_comments,
    permalink: `https://www.reddit.com${submission.permalink}`,
  };
}

// Very lightweight, non-exhaustive self-promo rule flagger.
// This does NOT replace reading a subreddit's actual rules — it's a
// best-effort sanity check to warn the user before they post.
const SELF_PROMO_KEYWORDS = [
  "buy now",
  "discount code",
  "limited time",
  "use code",
  "% off",
  "link in bio",
];

function checkSelfPromoRisk(content) {
  const lower = content.toLowerCase();
  const hits = SELF_PROMO_KEYWORDS.filter((kw) => lower.includes(kw));
  return {
    risky: hits.length > 0,
    matchedPhrases: hits,
    note:
      hits.length > 0
        ? "This reads like promotional/sales copy. Many subreddits ban this style outright — check the subreddit's rules (usually in the sidebar or /r/SUBREDDIT/wiki/rules) before posting."
        : "No obvious red flags, but always check the specific subreddit's self-promo rules manually — many require a karma minimum or a 9:1 non-self-promo ratio.",
  };
}

module.exports = {
  getRedditAuthUrl,
  exchangeRedditCode,
  getRedditClient,
  submitToSubreddit,
  getSubmissionStats,
  checkSelfPromoRisk,
};
