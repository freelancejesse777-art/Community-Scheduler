import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import { getWorkspaceOwnerId } from "../../../../lib/team";

const MAX_ITEMS = 12;

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const ownerId = getWorkspaceOwnerId(user.userId);

  const { postId, items } = await req.json();
  if (!postId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "postId and a non-empty items array are required" },
      { status: 400 }
    );
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `A campaign can schedule at most ${MAX_ITEMS} destinations at once.` },
      { status: 400 }
    );
  }

  // Every item needs the same set of fields the single-post /api/schedule
  // route requires — check up front so a bad row doesn't leave a partial
  // campaign scheduled.
  for (const item of items) {
    if (!item.connectionId || !item.destination || !item.adaptedContent || !item.scheduledFor) {
      return NextResponse.json(
        { error: "Each item needs connectionId, destination, adaptedContent, and scheduledFor" },
        { status: 400 }
      );
    }
  }

  // Confirm this post belongs to the requesting user before attaching
  // scheduled posts to it.
  const post = db.prepare("SELECT id FROM posts WHERE id = ? AND user_id = ?").get(postId, ownerId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (!isPro(ownerId)) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const count = db
      .prepare(
        `SELECT COUNT(*) as c FROM scheduled_posts sp
         JOIN posts p ON p.id = sp.post_id
         WHERE p.user_id = ? AND sp.created_at >= ?`
      )
      .get(ownerId, monthStart.toISOString()).c;

    if (count + items.length > FREE_PLAN_LIMITS.maxScheduledPostsPerMonth) {
      const remaining = Math.max(0, FREE_PLAN_LIMITS.maxScheduledPostsPerMonth - count);
      return NextResponse.json(
        {
          error: `Free plan allows ${FREE_PLAN_LIMITS.maxScheduledPostsPerMonth} scheduled posts per month — you have ${remaining} left, but this campaign has ${items.length}. Upgrade at /billing for unlimited, or trim the campaign.`,
        },
        { status: 403 }
      );
    }
  }

  const insert = db.prepare(
    `INSERT INTO scheduled_posts (post_id, connection_id, destination, adapted_content, scheduled_for)
     VALUES (?, ?, ?, ?, ?)`
  );

  // All-or-nothing: if any row fails to insert, nothing in this campaign
  // gets scheduled, so the user isn't left with a half-scheduled campaign.
  const insertAll = db.transaction((rows) => {
    const ids = [];
    for (const row of rows) {
      const info = insert.run(
        postId,
        row.connectionId,
        row.destination,
        row.adaptedContent,
        new Date(row.scheduledFor).toISOString()
      );
      ids.push(info.lastInsertRowid);
    }
    return ids;
  });

  try {
    const scheduledPostIds = insertAll(items);
    return NextResponse.json({ ok: true, scheduledPostIds });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
