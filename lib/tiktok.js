// lib/tiktok.js
// IMPORTANT — read before wiring this up:
//
// TikTok isn't a text platform like the others here. There's no "post a
// status update" endpoint — the Content Posting API only accepts a photo
// (or video) plus a caption. Since this app's compose flow only produces
// adapted text, TikTok destinations need an image URL supplied alongside
// the caption (the UI asks for this specifically when you pick TikTok).
//
// Also — until your TikTok Developer app passes their audit/review,
// TikTok only allows posting as a PRIVATE DRAFT to the connected user's
// own TikTok inbox. They have to open the TikTok app and manually tap
// "Post" to actually publish it — this code cannot auto-publish directly
// for an unaudited app, by TikTok's design, not a limitation here.
// Full auto-publish requires completing TikTok's app review first.
//
// Endpoint/scope names below reflect TikTok's Content Posting API docs
// at the time this was written — TikTok's API surface changes, so verify
// against https://developers.tiktok.com/doc/content-posting-api-get-started
// before relying on this in production.

const crypto = require("crypto");

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

function generatePkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

function getTikTokAuthUrl(state, codeChallenge) {
  const scopes = ["user.info.basic", "video.publish", "photo.publish"];
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    response_type: "code",
    scope: scopes.join(","),
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function exchangeTikTokCode(code, codeVerifier) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: TIKTOK_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error(`TikTok token exchange failed: ${await res.text()}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, open_id, ... }
}

async function refreshTikTokToken(refreshToken) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`TikTok token refresh failed: ${await res.text()}`);
  }
  return res.json();
}

// Posts a single photo + caption as a private draft to the connected
// user's TikTok inbox (see the module note above — auto-publish requires
// an audited app). imageUrl must be a publicly reachable https URL;
// TikTok fetches it server-side rather than accepting a raw upload here.
async function postPhotoToTikTok(accessToken, imageUrl, caption) {
  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: "SELF_ONLY",
        disable_comment: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [imageUrl],
      },
      post_mode: "MEDIA_UPLOAD",
      media_type: "PHOTO",
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(`TikTok post failed: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data; // { data: { publish_id }, ... }
}

module.exports = {
  generatePkcePair,
  getTikTokAuthUrl,
  exchangeTikTokCode,
  refreshTikTokToken,
  postPhotoToTikTok,
};
