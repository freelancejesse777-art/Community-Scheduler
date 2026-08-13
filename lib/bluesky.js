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
  const record = await res.json(); // { uri, cid }
  // Build the human-facing URL too, since callers (the scheduler) want
  // something to store/link to, not just the at:// URI.
  const rkey = record.uri.split("/").pop();
  const url = `https://bsky.app/profile/${session.handle}/post/${rkey}`;
  return { ...record, url, did: session.did, handle: session.handle };
}

// Used by the analytics/engagement refresh — pulls current like/repost/
// reply counts for a post we already submitted. Uses a fresh session since
// we don't keep the accessJwt from post time around.
async function getPostStats(handle, appPassword, postUri) {
  const session = await createBlueskySession(handle, appPassword);
  const url = `${BSKY_API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}&depth=0`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessJwt}` },
  });
  if (!res.ok) {
    throw new Error(`Bluesky post lookup failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const post = data.thread?.post;
  if (!post) throw new Error("Bluesky post not found (it may have been deleted).");
  return {
    likes: post.likeCount || 0,
    reposts: post.repostCount || 0,
    replies: post.replyCount || 0,
  };
}

module.exports = { postToBluesky, createBlueskySession, getPostStats };
