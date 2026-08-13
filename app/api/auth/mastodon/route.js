import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import { isWorkspaceOwner } from "../../../../lib/team";
import { verifyMastodonToken } from "../../../../lib/mastodon";

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

  const { instanceUrl, accessToken } = await req.json();
  if (!instanceUrl || !accessToken) {
    return NextResponse.json({ error: "Instance URL and access token are required." }, { status: 400 });
  }

  let hostname;
  try {
    hostname = new URL(instanceUrl).hostname;
  } catch {
    return NextResponse.json({ error: "That instance URL doesn't look valid — include https://" }, { status: 400 });
  }

  let account;
  try {
    account = await verifyMastodonToken(instanceUrl, accessToken);
  } catch (err) {
    return NextResponse.json({ error: "Couldn't verify that token." }, { status: 400 });
  }
  if (!account) {
    return NextResponse.json(
      { error: "That token didn't work — check the instance URL and token, and make sure it has write:statuses scope." },
      { status: 400 }
    );
  }

  db.prepare(
    `INSERT INTO connections (user_id, platform, account_label, credential_json)
     VALUES (?, 'mastodon', ?, ?)`
  ).run(
    user.userId,
    `@${account.username}@${hostname}`,
    JSON.stringify({ instanceUrl, accessToken })
  );

  return NextResponse.json({ ok: true });
}
