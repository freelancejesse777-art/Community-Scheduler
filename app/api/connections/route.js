import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const connections = db
    .prepare(
      "SELECT id, platform, account_label, created_at FROM connections WHERE user_id = ?"
    )
    .all(user.userId);

  return NextResponse.json({ connections });
}
