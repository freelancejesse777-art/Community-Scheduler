// lib/mastodon.js
// Mastodon posting via a personal access token. Mastodon's API is
// deliberately simple and doesn't require app review — a user generates
// their own token from their instance's settings (Preferences ->
// Development -> New Application), grants "write:statuses" scope, and
// pastes the token here. Works with any Mastodon instance (mastodon.social,
// a self-hosted one, etc.) since the instance URL is stored per-connection.

async function postToMastodon(instanceUrl, accessToken, content) {
  const url = `${instanceUrl.replace(/\/$/, "")}/api/v1/statuses`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ status: content }),
  });

  if (!res.ok) {
    throw new Error(`Mastodon post failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

// Used by the analytics/engagement refresh — pulls current favourite/
// reblog/reply counts for a status we already posted.
async function getStatusStats(instanceUrl, accessToken, statusId) {
  const url = `${instanceUrl.replace(/\/$/, "")}/api/v1/statuses/${statusId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Mastodon status lookup failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return {
    favourites: data.favourites_count,
    reblogs: data.reblogs_count,
    replies: data.replies_count,
    url: data.url,
  };
}

async function verifyMastodonToken(instanceUrl, accessToken) {
  try {
    const url = `${instanceUrl.replace(/\/$/, "")}/api/v1/accounts/verify_credentials`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null; // network error, bad instance URL, or non-JSON response
  }
}

module.exports = { postToMastodon, getStatusStats, verifyMastodonToken };
