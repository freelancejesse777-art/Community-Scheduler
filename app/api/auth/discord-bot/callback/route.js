import { NextResponse } from "next/server";
import db from "../../../../../lib/db";
import { publicUrl } from "../../../../../lib/publicUrl";
import { getGuildName } from "../../../../../lib/discordBot";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guild_id");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(publicUrl(`/connect?error=${encodeURIComponent(error)}`, req));
  }

  const pkceRow = db
    .prepare("SELECT * FROM oauth_pkce_state WHERE state = ? AND provider = 'discord_bot'")
    .get(state);

  if (!pkceRow || pkceRow.expires_at < Date.now() || !guildId) {
    return NextResponse.redirect(
      publicUrl("/connect?error=Discord bot invite session expired, try again", req)
    );
  }

  // One-time use
  db.prepare("DELETE FROM oauth_pkce_state WHERE id = ?").run(pkceRow.id);

  const guildName = (await getGuildName(guildId)) || "Discord server";

  // Hand off to the channel-picker step on the Connect page — the user's
  // own session cookie is still present for this request (it's a normal
  // browser redirect), so no need to carry userId through the URL.
  return NextResponse.redirect(
    publicUrl(
      `/connect?discordBotGuildId=${encodeURIComponent(guildId)}&discordBotGuildName=${encodeURIComponent(guildName)}`,
      req
    )
  );
}
