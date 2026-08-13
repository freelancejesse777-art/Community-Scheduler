import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import { isWorkspaceOwner } from "../../../../lib/team";
import { verifyTelegramBot } from "../../../../lib/telegram";

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

  const { botToken, chatId, label } = await req.json();
  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Bot token and chat ID are required." }, { status: 400 });
  }

  const bot = await verifyTelegramBot(botToken);
  if (!bot) {
    return NextResponse.json({ error: "That bot token didn't work — double check it from @BotFather." }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO connections (user_id, platform, account_label, credential_json)
     VALUES (?, 'telegram', ?, ?)`
  ).run(
    user.userId,
    label || `@${bot.username}`,
    JSON.stringify({ botToken, chatId })
  );

  return NextResponse.json({ ok: true });
}
