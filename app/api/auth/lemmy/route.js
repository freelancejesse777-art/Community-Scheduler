import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import { isWorkspaceOwner } from "../../../../lib/team";
import { lemmyLogin } from "../../../../lib/lemmy";

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

  const { instanceUrl, username, password } = await req.json();
  if (!instanceUrl || !username || !password) {
    return NextResponse.json({ error: "Instance URL, username, and password are all required." }, { status: 400 });
  }

  let jwt;
  try {
    jwt = await lemmyLogin(instanceUrl, username, password);
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 });
  }

  let hostname;
  try {
    hostname = new URL(instanceUrl).hostname;
  } catch {
    return NextResponse.json({ error: "That instance URL doesn't look valid — include https://" }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO connections (user_id, platform, account_label, credential_json)
     VALUES (?, 'lemmy', ?, ?)`
  ).run(user.userId, `${username}@${hostname}`, JSON.stringify({ instanceUrl, username, password }));

  return NextResponse.json({ ok: true });
}
