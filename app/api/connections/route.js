import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { getWorkspaceOwnerId } from "../../../lib/team";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const ownerId = getWorkspaceOwnerId(user.userId);
  const connections = db
    .prepare(
      "SELECT id, platform, account_label, created_at FROM connections WHERE user_id = ?"
    )
    .all(ownerId);

  return NextResponse.json({ connections });
}
