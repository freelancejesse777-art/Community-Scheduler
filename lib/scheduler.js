// lib/scheduler.js
const db = require("./db");
const { submitToSubreddit } = require("./reddit");
const { postToDiscordWebhook } = require("./discord");
const { postToMastodon } = require("./mastodon");
const { postToTelegram } = require("./telegram");
const { postToBluesky } = require("./bluesky");
const { postTweet, refreshTwitterToken } = require("./twitter");
const { postToFacebookPage } = require("./facebook");
const { lemmyLogin, postToLemmy } = require("./lemmy");
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

      if (job.platform === "reddit") {
        const subreddit = job.destination.replace(/^r\//, "");
        const [title, ...rest] = job.adapted_content.split("\n");
        const body = rest.join("\n").trim() || job.adapted_content;
        await submitToSubreddit(job, subreddit, title, body);
      } else if (job.platform === "discord") {
        await postToDiscordWebhook(job.webhook_url, job.adapted_content);
      } else if (job.platform === "mastodon") {
        await postToMastodon(creds.instanceUrl, creds.accessToken, job.adapted_content);
      } else if (job.platform === "telegram") {
        await postToTelegram(creds.botToken, creds.chatId, job.adapted_content);
      } else if (job.platform === "bluesky") {
        await postToBluesky(creds.handle, creds.appPassword, job.adapted_content);
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
        await postTweet(accessToken, job.adapted_content);
      } else if (job.platform === "facebook") {
        await postToFacebookPage(creds.pageId, creds.pageAccessToken, job.adapted_content);
      } else if (job.platform === "lemmy") {
        const jwt = await lemmyLogin(creds.instanceUrl, creds.username, creds.password);
        const [title, ...rest] = job.adapted_content.split("\n");
        const body = rest.join("\n").trim() || job.adapted_content;
        const communityName = job.destination.replace(/^!/, "").split("@")[0];
        await postToLemmy(creds.instanceUrl, jwt, communityName, title, body);
      } else {
        throw new Error(`Unsupported platform: ${job.platform}`);
      }

      db.prepare(
        "UPDATE scheduled_posts SET status = 'posted', result_message = ? WHERE id = ?"
      ).run("Posted successfully", job.id);
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
