import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { getWorkspaceOwnerId } from "../../../lib/team";
import { logError } from "../../../lib/logger";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  try {
    const ownerId = getWorkspaceOwnerId(user.userId);
    const rows = db
      .prepare(
        `SELECT p.id as post_id, p.title, p.base_content, p.created_at as post_created_at,
                sp.id as scheduled_id, sp.destination, sp.status, sp.scheduled_for,
                sp.posted_url, sp.result_message, c.platform, c.account_label
         FROM posts p
         JOIN scheduled_posts sp ON sp.post_id = p.id
         JOIN connections c ON c.id = sp.connection_id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC, sp.scheduled_for ASC`
      )
      .all(ownerId);

    const campaignsByPostId = new Map();
    for (const r of rows) {
      if (!campaignsByPostId.has(r.post_id)) {
        campaignsByPostId.set(r.post_id, {
          postId: r.post_id,
          title: r.title,
          baseContent: r.base_content,
          createdAt: r.post_created_at,
          items: [],
        });
      }
      campaignsByPostId.get(r.post_id).items.push({
        id: r.scheduled_id,
        destination: r.destination,
        status: r.status,
        scheduledFor: r.scheduled_for,
        postedUrl: r.posted_url,
        resultMessage: r.result_message,
        platform: r.platform,
        accountLabel: r.account_label,
      });
    }

    const campaigns = [...campaignsByPostId.values()].map((c) => ({
      ...c,
      destinationCount: c.items.length,
      postedCount: c.items.filter((i) => i.status === "posted").length,
      pendingCount: c.items.filter((i) => i.status === "pending").length,
      failedCount: c.items.filter((i) => i.status === "failed").length,
    }));

    return NextResponse.json({ campaigns });
  } catch (err) {
    logError(err, { context: "campaigns route", userId: user.userId });
    return NextResponse.json(
      { error: "Couldn't load campaigns. Try again in a moment." },
      { status: 500 }
    );
  }
}
