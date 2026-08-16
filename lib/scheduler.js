// lib/scheduler.js
const db = require("./db");
const { submitToSubreddit } = require("./reddit");
const { postToDiscordWebhook } = require("./discord");
const { postMessageAsBot } = require("./discordBot");
const { postToMastodon } = require("./mastodon");
const { postToTelegram } = require("./telegram");
const { postToBluesky } = require("./bluesky");
const { postTweet, refreshTwitterToken } = require("./twitter");
const { postToFacebookPage } = require("./facebook");
const { lemmyLogin, postToLemmy } = require("./lemmy");
const { postPhotoToTikTok, refreshTikTokToken } = require("./tiktok");
const { logInfo, logError } = require("./logger");

async function runDueScheduledPosts() {
  const now = new Date().toISOString();

  const due = db
    .prepare(
      `SELECT sp.*, c.id as connection_id, c.platform, c.refresh_token, c.access_token, c.webhook_url, c.credential_json, c.expires_at
       FROM scheduled_posts sp
       JOIN connections c ON c.id = sp.connection_id
       WHERE sp.status = 'pending' AND sp.scheduled_for <= ?`
    )
    .all(now);

  logInfo("Scheduler run started", { dueCount: due.length });

  const results = [];

  for (const job of due) {
    try {
      const creds = job.credential_json ? JSON.parse(job.credential_json) : {};
      // Platform-native id/URL for the post we just made, when the
      // platform's API hands one back. Used for post history & analytics.
      let platformPostId = null;
      let postedUrl = null;

      if (job.platform === "reddit") {
        const subreddit = job.destination.replace(/^r\//, "");
        const [title, ...rest] = job.adapted_content.split("\n");
        const body = rest.join("\n").trim() || job.adapted_content;
        const submission = await submitToSubreddit(job, subreddit, title, body);
        platformPostId = submission.name || submission.id;
        postedUrl = `https://www.reddit.com${submission.permalink}`;
      } else if (job.platform === "discord") {
        await postToDiscordWebhook(job.webhook_url, job.adapted_content);
        // Discord webhooks are anonymous/one-way by design — no post id or
        // URL to read back without extra scopes, so history shows it as
        // posted but without a link.
      } else if (job.platform === "discord_bot") {
        const result = await postMessageAsBot(creds.channelId, job.adapted_content);
        platformPostId = result.id || null;
        if (platformPostId && creds.guildId) {
          postedUrl = `https://discord.com/channels/${creds.guildId}/${creds.channelId}/${platformPostId}`;
        }
      } else if (job.platform === "mastodon") {
        const status = await postToMastodon(creds.instanceUrl, creds.accessToken, job.adapted_content);
        platformPostId = status.id;
        postedUrl = status.url;
      } else if (job.platform === "telegram") {
        const result = await postToTelegram(creds.botToken, creds.chatId, job.adapted_content);
        platformPostId = result.result?.message_id ? String(result.result.message_id) : null;
        // Only public channels (username starting with @) have a shareable URL
        if (typeof creds.chatId === "string" && creds.chatId.startsWith("@") && platformPostId) {
          postedUrl = `https://t.me/${creds.chatId.slice(1)}/${platformPostId}`;
        }
      } else if (job.platform === "bluesky") {
        const result = await postToBluesky(creds.handle, creds.appPassword, job.adapted_content);
        platformPostId = result.uri;
        postedUrl = result.url;
      } else if (job.platform === "twitter") {
        let accessToken = job.access_token;
        // X access tokens expire — refresh if we're past (or near) expiry
        if (job.expires_at && Date.now() > job.expires_at - 60000) {
          const refreshed = await refreshTwitterToken(job.refresh_token);
          accessToken = refreshed.access_token;
          db.prepare(
            "UPDATE connections SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?"
          ).run(
            refreshed.access_token,
            refreshed.refresh_token || job.refresh_token,
            Date.now() + refreshed.expires_in * 1000,
            job.connection_id
          );
        }
        const result = await postTweet(accessToken, job.adapted_content);
        platformPostId = result.data?.id || null;
        // No stored handle to build a profile URL from — x.com/i/web/status/
        // works without one and redirects to the canonical tweet URL.
        if (platformPostId) postedUrl = `https://x.com/i/web/status/${platformPostId}`;
      } else if (job.platform === "facebook") {
        const result = await postToFacebookPage(creds.pageId, creds.pageAccessToken, job.adapted_content);
        platformPostId = result.id || null;
        if (platformPostId) postedUrl = `https://www.facebook.com/${platformPostId}`;
      } else if (job.platform === "lemmy") {
        const jwt = await lemmyLogin(creds.instanceUrl, creds.username, creds.password);
        const [title, ...rest] = job.adapted_content.split("\n");
        const body = rest.join("\n").trim() || job.adapted_content;
        const communityName = job.destination.replace(/^!/, "").split("@")[0];
        const result = await postToLemmy(creds.instanceUrl, jwt, communityName, title, body);
        platformPostId = result.post_view?.post?.id ? String(result.post_view.post.id) : null;
        if (platformPostId) postedUrl = `${creds.instanceUrl.replace(/\/$/, "")}/post/${platformPostId}`;
      } else if (job.platform === "tiktok") {
        let accessToken = job.access_token;
        if (job.expires_at && Date.now() > job.expires_at - 60000) {
          const refreshed = await refreshTikTokToken(job.refresh_token);
          accessToken = refreshed.access_token;
          db.prepare(
            "UPDATE connections SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?"
          ).run(
            refreshed.access_token,
            refreshed.refresh_token || job.refresh_token,
            Date.now() + refreshed.expires_in * 1000,
            job.connection_id
          );
        }
        // TikTok destinations store the image URL (there's no
        // subreddit/channel equivalent for TikTok — see lib/tiktok.js).
        // Unaudited apps can only land this as a private draft in the
        // user's TikTok inbox, not a live public post — see the note in
        // lib/tiktok.js for what that means in practice.
        const result = await postPhotoToTikTok(accessToken, job.destination, job.adapted_content);
        platformPostId = result.data?.publish_id || null;
        // No public URL is returned for draft posts — nothing to link to
        // until the user manually publishes it from inside the TikTok app.
      } else {
        throw new Error(`Unsupported platform: ${job.platform}`);
      }

      const resultMessage =
        job.platform === "tiktok"
          ? "Sent to TikTok as a private draft — open the TikTok app to finish publishing it."
          : "Posted successfully";

      db.prepare(
        `UPDATE scheduled_posts
         SET status = 'posted', result_message = ?, platform_post_id = ?, posted_url = ?
         WHERE id = ?`
      ).run(resultMessage, platformPostId, postedUrl, job.id);
      logInfo("Post submitted", { jobId: job.id, platform: job.platform, destination: job.destination });
      results.push({ id: job.id, status: "posted" });
    } catch (err) {
      logError(err, { jobId: job.id, platform: job.platform, destination: job.destination });
      db.prepare(
        "UPDATE scheduled_posts SET status = 'failed', result_message = ? WHERE id = ?"
      ).run(String(err.message || err), job.id);
      results.push({ id: job.id, status: "failed", error: String(err) });
    }
  }

  return results;
}

module.exports = { runDueScheduledPosts };
