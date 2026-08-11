import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import { verifyFacebookPageToken } from "../../../../lib/facebook";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

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

  const { pageId, pageAccessToken } = await req.json();
  if (!pageId || !pageAccessToken) {
    return NextResponse.json({ error: "Page ID and Page Access Token are required." }, { status: 400 });
  }

  const page = await verifyFacebookPageToken(pageId, pageAccessToken);
  if (!page) {
    return NextResponse.json(
      { error: "That token didn't work — regenerate it from Graph API Explorer and make sure it's a Page token, not a User token." },
      { status: 400 }
    );
  }

  db.prepare(
    `INSERT INTO connections (user_id, platform, account_label, credential_json)
     VALUES (?, 'facebook', ?, ?)`
  ).run(user.userId, page.name, JSON.stringify({ pageId, pageAccessToken }));

  return NextResponse.json({ ok: true });
}
