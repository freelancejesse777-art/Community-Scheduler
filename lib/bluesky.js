// lib/bluesky.js
// Bluesky posting via the AT Protocol. Users generate an "app password"
// from Settings -> App Passwords (separate from their real password, and
// revocable at any time) — no OAuth app review process needed.

const BSKY_API = "https://bsky.social/xrpc";

async function createBlueskySession(handle, appPassword) {
  const res = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });

  if (!res.ok) {
    throw new Error(`Bluesky login failed (${res.status}): ${await res.text()}`);
  }
  return res.json(); // { accessJwt, did, handle, ... }
}

async function postToBluesky(handle, appPassword, content) {
  const session = await createBlueskySession(handle, appPassword);

  const res = await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        text: content,
        createdAt: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Bluesky post failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

module.exports = { postToBluesky, createBlueskySession };
