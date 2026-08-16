import { NextResponse } from "next/server";
import db from "../../../../../lib/db";
import { getCurrentUser } from "../../../../../lib/session";
import { isWorkspaceOwner } from "../../../../../lib/team";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (!isWorkspaceOwner(user.userId)) {
    return NextResponse.json({ error: "Only the workspace owner can manage connections." }, { status: 403 });
  }

  const { guildId, guildName, channelId, channelName } = await req.json();
  if (!guildId || !channelId) {
    return NextResponse.json({ error: "Missing guild or channel." }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO connections (user_id, platform, account_label, credential_json)
     VALUES (?, 'discord_bot', ?, ?)`
  ).run(
    user.userId,
    `${guildName || "Discord server"} #${channelName || channelId}`,
    JSON.stringify({ guildId, channelId })
  );

  return NextResponse.json({ ok: true });
}
