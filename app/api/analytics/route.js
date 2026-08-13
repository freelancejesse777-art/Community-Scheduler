import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { getWorkspaceOwnerId } from "../../../lib/team";
import { engagementSupported } from "../../../lib/engagement";
import { logError } from "../../../lib/logger";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  try {
    const ownerId = getWorkspaceOwnerId(user.userId);
    // Full history, newest first — this backs both the summary numbers
    // below (computed in JS, since sqlite date math across statuses gets
    // messy fast) and the history table on the page.
    const rows = db
      .prepare(
        `SELECT sp.id, sp.destination, sp.status, sp.scheduled_for, sp.created_at,
                sp.result_message, sp.posted_url, sp.platform_post_id,
                sp.engagement_score, sp.engagement_comments, sp.engagement_checked_at,
                sp.engagement_error, c.platform, c.account_label
         FROM scheduled_posts sp
         JOIN posts p ON p.id = sp.post_id
         JOIN connections c ON c.id = sp.connection_id
         WHERE p.user_id = ?
         ORDER BY sp.scheduled_for DESC`
      )
      .all(ownerId);

    const totalPosts = rows.length;
    const posted = rows.filter((r) => r.status === "posted");
    const failed = rows.filter((r) => r.status === "failed");
    const pending = rows.filter((r) => r.status === "pending");
    const successRate = posted.length + failed.length > 0
      ? Math.round((posted.length / (posted.length + failed.length)) * 100)
      : null;

    // Breakdown by platform — count + success rate per platform, sorted by volume
    const byPlatformMap = new Map();
    for (const r of rows) {
      if (!byPlatformMap.has(r.platform)) {
        byPlatformMap.set(r.platform, { platform: r.platform, total: 0, posted: 0, failed: 0, pending: 0 });
      }
      const entry = byPlatformMap.get(r.platform);
      entry.total += 1;
      entry[r.status] = (entry[r.status] || 0) + 1;
    }
    const byPlatform = [...byPlatformMap.values()].sort((a, b) => b.total - a.total);

    // Posts per day for the last 14 days, oldest first — enough for a small trend view
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    const timeline = days.map((day) => {
      const dayStart = day.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const count = rows.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      return { date: day.toISOString().slice(0, 10), count };
    });

    // Best-performing posts by engagement, where we have numbers for them
    const withEngagement = posted
      .filter((r) => r.engagement_score !== null && r.engagement_score !== undefined)
      .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
      .slice(0, 5);

    const history = rows.map((r) => ({
      ...r,
      engagementSupported: engagementSupported(r.platform),
    }));

    return NextResponse.json({
      summary: {
        totalPosts,
        postedCount: posted.length,
        failedCount: failed.length,
        pendingCount: pending.length,
        successRate,
      },
      byPlatform,
      timeline,
      topPosts: withEngagement,
      history,
    });
  } catch (err) {
    logError(err, { context: "analytics route", userId: user.userId });
    return NextResponse.json(
      { error: "Couldn't load analytics. Try again in a moment." },
      { status: 500 }
    );
  }
}
