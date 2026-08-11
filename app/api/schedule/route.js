import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../lib/billing";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!isPro(user.userId)) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const count = db
      .prepare(
        `SELECT COUNT(*) as c FROM scheduled_posts sp
         JOIN posts p ON p.id = sp.post_id
         WHERE p.user_id = ? AND sp.created_at >= ?`
      )
      .get(user.userId, monthStart.toISOString()).c;

    if (count >= FREE_PLAN_LIMITS.maxScheduledPostsPerMonth) {
      return NextResponse.json(
        {
          error: `Free plan allows ${FREE_PLAN_LIMITS.maxScheduledPostsPerMonth} scheduled posts per month. Upgrade at /billing for unlimited.`,
        },
        { status: 403 }
      );
    }
  }

  const { postId, connectionId, destination, adaptedContent, scheduledFor } =
    await req.json();

  if (!postId || !connectionId || !destination || !adaptedContent || !scheduledFor) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const info = db
    .prepare(
      `INSERT INTO scheduled_posts (post_id, connection_id, destination, adapted_content, scheduled_for)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(postId, connectionId, destination, adaptedContent, scheduledFor);

  return NextResponse.json({ ok: true, scheduledPostId: info.lastInsertRowid });
}

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const rows = db
    .prepare(
      `SELECT sp.*, p.title, p.base_content, c.platform, c.account_label
       FROM scheduled_posts sp
       JOIN posts p ON p.id = sp.post_id
       JOIN connections c ON c.id = sp.connection_id
       WHERE p.user_id = ?
       ORDER BY sp.scheduled_for ASC`
    )
    .all(user.userId);

  return NextResponse.json({ scheduled: rows });
}
