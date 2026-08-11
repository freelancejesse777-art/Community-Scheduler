import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { title, baseContent } = await req.json();
  if (!baseContent) {
    return NextResponse.json({ error: "baseContent is required" }, { status: 400 });
  }

  const info = db
    .prepare("INSERT INTO posts (user_id, title, base_content) VALUES (?, ?, ?)")
    .run(user.userId, title || null, baseContent);

  return NextResponse.json({ ok: true, postId: info.lastInsertRowid });
}

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const posts = db
    .prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.userId);

  return NextResponse.json({ posts });
}
