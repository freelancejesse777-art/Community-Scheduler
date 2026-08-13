import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { getWorkspaceOwnerId } from "../../../../lib/team";
import { engagementSupported, refreshEngagementForRow } from "../../../../lib/engagement";
import { logError } from "../../../../lib/logger";

// Cap how many we refresh in one call — refreshing engagement means live
// API calls to each platform, so an unbounded "refresh everything" could
// be slow or trip rate limits. The UI can call this again for more.
const MAX_PER_CALL = 15;

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let scheduledPostId = null;
  try {
    const body = await req.json();
    scheduledPostId = body?.scheduledPostId || null;
  } catch {
    // no body sent — refresh-all mode
  }

  try {
    const ownerId = getWorkspaceOwnerId(user.userId);
    const baseQuery = `
      SELECT sp.id, sp.platform_post_id, sp.posted_url, sp.destination,
             c.platform, c.refresh_token, c.access_token, c.credential_json
      FROM scheduled_posts sp
      JOIN posts p ON p.id = sp.post_id
      JOIN connections c ON c.id = sp.connection_id
      WHERE p.user_id = ? AND sp.status = 'posted' AND sp.platform_post_id IS NOT NULL
    `;

    const rows = scheduledPostId
      ? db.prepare(`${baseQuery} AND sp.id = ?`).all(ownerId, scheduledPostId)
      : db.prepare(`${baseQuery} ORDER BY sp.engagement_checked_at ASC NULLS FIRST LIMIT ?`).all(ownerId, MAX_PER_CALL);

    const eligible = rows.filter((r) => engagementSupported(r.platform));
    const results = [];

    for (const row of eligible) {
      try {
        const stats = await refreshEngagementForRow(row);
        db.prepare(
          `UPDATE scheduled_posts
           SET engagement_score = ?, engagement_comments = ?, engagement_checked_at = ?,
               engagement_error = NULL, posted_url = COALESCE(?, posted_url)
           WHERE id = ?`
        ).run(stats.score ?? null, stats.comments ?? null, new Date().toISOString(), stats.url || null, row.id);
        results.push({ id: row.id, ok: true, ...stats });
      } catch (err) {
        db.prepare(
          `UPDATE scheduled_posts SET engagement_error = ?, engagement_checked_at = ? WHERE id = ?`
        ).run(String(err.message || err), new Date().toISOString(), row.id);
        results.push({ id: row.id, ok: false, error: String(err.message || err) });
      }
    }

    return NextResponse.json({
      refreshed: results.length,
      skipped: rows.length - eligible.length,
      results,
    });
  } catch (err) {
    logError(err, { context: "analytics refresh route", userId: user.userId });
    return NextResponse.json(
      { error: "Couldn't refresh engagement stats. Try again in a moment." },
      { status: 500 }
    );
  }
}
