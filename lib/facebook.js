// lib/facebook.js
// Facebook requires Meta App Review + Business Verification before an app
// can post to Pages it doesn't own — that process takes weeks. Until you
// clear it, this only works for Pages you personally administer, using a
// long-lived Page Access Token generated manually via Graph API Explorer
// (developers.facebook.com/tools/explorer): select your app, select the
// Page, grant pages_manage_posts + pages_read_engagement + pages_show_list,
// generate a token, then use the token debugger to extend it to
// long-lived (60 days) before pasting it here.

const GRAPH_API = "https://graph.facebook.com/v19.0";

async function postToFacebookPage(pageId, pageAccessToken, content) {
  const url = `${GRAPH_API}/${pageId}/feed`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: content, access_token: pageAccessToken }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Facebook post failed: ${data.error.message}`);
  }
  return data;
}

async function verifyFacebookPageToken(pageId, pageAccessToken) {
  const url = `${GRAPH_API}/${pageId}?fields=name&access_token=${pageAccessToken}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) return null;
    return data; // { id, name }
  } catch {
    return null;
  }
}

module.exports = { postToFacebookPage, verifyFacebookPageToken };
