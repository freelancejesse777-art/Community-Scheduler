import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";

export async function POST() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  db.prepare("UPDATE users SET onboarding_completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.userId);
  return NextResponse.json({ ok: true });
}
