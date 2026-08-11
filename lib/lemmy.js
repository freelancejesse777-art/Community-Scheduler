// lib/lemmy.js
// Lemmy is a federated, Reddit-style platform — posts go to "communities"
// on a specific instance (e.g. lemmy.world, lemmy.ml). Auth is simple
// username/password (no OAuth app review), returning a JWT used for API
// calls. No app registration needed at all.

async function lemmyLogin(instanceUrl, usernameOrEmail, password) {
  const url = `${instanceUrl.replace(/\/$/, "")}/api/v3/user/login`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
  });

  if (!res.ok) {
    throw new Error(`Lemmy login failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.jwt) {
    throw new Error("Lemmy login didn't return a token — check your credentials, or the instance may require 2FA (not supported here).");
  }
  return data.jwt;
}

async function getLemmyCommunityId(instanceUrl, jwt, communityName) {
  const url = `${instanceUrl.replace(/\/$/, "")}/api/v3/community?name=${encodeURIComponent(communityName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    throw new Error(`Couldn't find Lemmy community "${communityName}"`);
  }
  const data = await res.json();
  return data.community_view.community.id;
}

async function postToLemmy(instanceUrl, jwt, communityName, title, body) {
  const communityId = await getLemmyCommunityId(instanceUrl, jwt, communityName);

  const url = `${instanceUrl.replace(/\/$/, "")}/api/v3/post`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: title,
      body,
      community_id: communityId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Lemmy post failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

module.exports = { lemmyLogin, postToLemmy };
