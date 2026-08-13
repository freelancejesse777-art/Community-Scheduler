import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { getWorkspaceOwnerId } from "../../../lib/team";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { title, baseContent } = await req.json();
  if (!baseContent) {
    return NextResponse.json({ error: "baseContent is required" }, { status: 400 });
  }

  const ownerId = getWorkspaceOwnerId(user.userId);
  const info = db
    .prepare("INSERT INTO posts (user_id, title, base_content) VALUES (?, ?, ?)")
    .run(ownerId, title || null, baseContent);

  return NextResponse.json({ ok: true, postId: info.lastInsertRowid });
}

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const ownerId = getWorkspaceOwnerId(user.userId);
  const posts = db
    .prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC")
    .all(ownerId);

  return NextResponse.json({ posts });
}
