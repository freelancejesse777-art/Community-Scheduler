import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { getWorkspaceOwnerId, isWorkspaceOwner } from "../../../../lib/team";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const userRow = db.prepare("SELECT onboarding_completed_at FROM users WHERE id = ?").get(user.userId);
  const ownerId = getWorkspaceOwnerId(user.userId);

  const connectionsCount = db.prepare("SELECT COUNT(*) as c FROM connections WHERE user_id = ?").get(ownerId).c;
  const scheduledCount = db
    .prepare(
      `SELECT COUNT(*) as c FROM scheduled_posts sp
       JOIN posts p ON p.id = sp.post_id
       WHERE p.user_id = ?`
    )
    .get(ownerId).c;
  const postedCount = db
    .prepare(
      `SELECT COUNT(*) as c FROM scheduled_posts sp
       JOIN posts p ON p.id = sp.post_id
       WHERE p.user_id = ? AND sp.status = 'posted'`
    )
    .get(ownerId).c;

  return NextResponse.json({
    dismissed: !!userRow?.onboarding_completed_at,
    isWorkspaceOwner: isWorkspaceOwner(user.userId),
    hasConnection: connectionsCount > 0,
    hasScheduled: scheduledCount > 0,
    hasPosted: postedCount > 0,
  });
}
