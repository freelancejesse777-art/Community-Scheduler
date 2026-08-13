import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import { isWorkspaceOwner } from "../../../../lib/team";
import { createBlueskySession } from "../../../../lib/bluesky";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!isWorkspaceOwner(user.userId)) {
    return NextResponse.json(
      { error: "Only the workspace owner can manage connections." },
      { status: 403 }
    );
  }

  if (!isPro(user.userId)) {
    const count = db
      .prepare("SELECT COUNT(*) as c FROM connections WHERE user_id = ?")
      .get(user.userId).c;
    if (count >= FREE_PLAN_LIMITS.maxConnections) {
      return NextResponse.json(
        { error: `Free plan allows ${FREE_PLAN_LIMITS.maxConnections} connection. Upgrade at /billing for more.` },
        { status: 403 }
      );
    }
  }

  const { handle, appPassword } = await req.json();
  if (!handle || !appPassword) {
    return NextResponse.json({ error: "Handle and app password are required." }, { status: 400 });
  }

  try {
    await createBlueskySession(handle, appPassword);
  } catch (err) {
    return NextResponse.json(
      { error: "Couldn't log in — check your handle and app password (not your real account password)." },
      { status: 400 }
    );
  }

  db.prepare(
    `INSERT INTO connections (user_id, platform, account_label, credential_json)
     VALUES (?, 'bluesky', ?, ?)`
  ).run(user.userId, handle, JSON.stringify({ handle, appPassword }));

  return NextResponse.json({ ok: true });
}
