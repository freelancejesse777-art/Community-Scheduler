import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { getWorkspaceOwnerId } from "../../../../lib/team";

// Confirms the scheduled post belongs to the requesting user's workspace and returns it.
function getOwnedScheduledPost(id, ownerId) {
  return db
    .prepare(
      `SELECT sp.* FROM scheduled_posts sp
       JOIN posts p ON p.id = sp.post_id
       WHERE sp.id = ? AND p.user_id = ?`
    )
    .get(id, ownerId);
}

// Reschedule a pending post to a new time (used by the calendar's
// drag-and-drop and its "reschedule" fallback control). Only pending posts
// can move — once something's posted or failed, the time is history.
export async function PATCH(req, { params }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id } = params;
  const ownerId = getWorkspaceOwnerId(user.userId);
  const existing = getOwnedScheduledPost(id, ownerId);
  if (!existing) {
    return NextResponse.json({ error: "Scheduled post not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Can't reschedule a post that's already ${existing.status}.` },
      { status: 400 }
    );
  }

  const { scheduledFor } = await req.json();
  if (!scheduledFor) {
    return NextResponse.json({ error: "scheduledFor is required" }, { status: 400 });
  }

  db.prepare("UPDATE scheduled_posts SET scheduled_for = ? WHERE id = ?").run(
    new Date(scheduledFor).toISOString(),
    id
  );

  return NextResponse.json({ ok: true });
}

// Cancel a pending post. Posted/failed posts stay in history for analytics
// rather than being deletable — only pending ones can be pulled.
export async function DELETE(req, { params }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id } = params;
  const ownerId = getWorkspaceOwnerId(user.userId);
  const existing = getOwnedScheduledPost(id, ownerId);
  if (!existing) {
    return NextResponse.json({ error: "Scheduled post not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: `Can't cancel a post that's already ${existing.status}.` },
      { status: 400 }
    );
  }

  db.prepare("DELETE FROM scheduled_posts WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
