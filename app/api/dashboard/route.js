import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../lib/billing";
import { logError } from "../../../lib/logger";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  try {
    const userRow = db.prepare("SELECT email_verified FROM users WHERE id = ?").get(user.userId);

    const connectionsCount = db
      .prepare("SELECT COUNT(*) as c FROM connections WHERE user_id = ?")
      .get(user.userId).c;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const scheduledThisMonth = db
      .prepare(
        `SELECT COUNT(*) as c FROM scheduled_posts sp
         JOIN posts p ON p.id = sp.post_id
         WHERE p.user_id = ? AND sp.created_at >= ?`
      )
      .get(user.userId, monthStart.toISOString()).c;

    const statusCounts = db
      .prepare(
        `SELECT sp.status, COUNT(*) as c FROM scheduled_posts sp
         JOIN posts p ON p.id = sp.post_id
         WHERE p.user_id = ?
         GROUP BY sp.status`
      )
      .all(user.userId);

    const recentActivity = db
      .prepare(
        `SELECT sp.destination, sp.status, sp.scheduled_for, sp.result_message, c.platform
         FROM scheduled_posts sp
         JOIN posts p ON p.id = sp.post_id
         JOIN connections c ON c.id = sp.connection_id
         WHERE p.user_id = ?
         ORDER BY sp.created_at DESC
         LIMIT 10`
      )
      .all(user.userId);

    return NextResponse.json({
      plan: isPro(user.userId) ? "pro" : "free",
      emailVerified: !!userRow?.email_verified,
      connectionsCount,
      scheduledThisMonth,
      limits: FREE_PLAN_LIMITS,
      statusCounts,
      recentActivity,
    });
  } catch (err) {
    logError(err, { context: "dashboard route", userId: user.userId });
    return NextResponse.json(
      { error: "Couldn't load dashboard data. Try again in a moment." },
      { status: 500 }
    );
  }
}
