// lib/engagement.js
// Central place for "go check how a already-posted post is doing" logic.
// Not every platform exposes read-back stats through a simple API call —
// Discord webhooks are anonymous/one-way, Telegram bots can't read view
// counts, Facebook/X require extra review'd permissions we don't ask for.
// Where a platform DOES support it cheaply, we implement it here.

const { getSubmissionStats } = require("./reddit");
const { getStatusStats } = require("./mastodon");
const { getPostStats: getLemmyPostStats } = require("./lemmy");
const { getPostStats: getBlueskyPostStats } = require("./bluesky");

// Platforms where refreshEngagementForRow() can actually fetch numbers.
const SUPPORTED_PLATFORMS = new Set(["reddit", "mastodon", "lemmy", "bluesky"]);

function engagementSupported(platform) {
  return SUPPORTED_PLATFORMS.has(platform);
}

// `row` is a scheduled_posts row joined with its connection (same shape
// scheduler.js works with): needs platform, platform_post_id, and whatever
// connection fields that platform's stats call needs.
async function refreshEngagementForRow(row) {
  if (!row.platform_post_id) {
    throw new Error("No stored post ID for this platform — can't look up stats.");
  }

  const creds = row.credential_json ? JSON.parse(row.credential_json) : {};

  switch (row.platform) {
    case "reddit": {
      const stats = await getSubmissionStats(row, row.platform_post_id);
      return { score: stats.score, comments: stats.numComments, url: stats.permalink };
    }
    case "mastodon": {
      const stats = await getStatusStats(creds.instanceUrl, creds.accessToken, row.platform_post_id);
      return { score: stats.favourites, comments: stats.replies, url: stats.url };
    }
    case "lemmy": {
      const stats = await getLemmyPostStats(creds.instanceUrl, row.lemmy_jwt || (await freshLemmyJwt(creds)), row.platform_post_id);
      return { score: stats.score, comments: stats.comments, url: stats.url };
    }
    case "bluesky": {
      const stats = await getBlueskyPostStats(creds.handle, creds.appPassword, row.platform_post_id);
      return { score: stats.likes, comments: stats.replies, url: row.posted_url };
    }
    default:
      throw new Error(`Engagement lookup isn't supported for ${row.platform} yet.`);
  }
}

async function freshLemmyJwt(creds) {
  const { lemmyLogin } = require("./lemmy");
  return lemmyLogin(creds.instanceUrl, creds.username, creds.password);
}

module.exports = { engagementSupported, refreshEngagementForRow, SUPPORTED_PLATFORMS };
