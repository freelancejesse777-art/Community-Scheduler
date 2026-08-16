import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "../../../../lib/session";
import { publicUrl } from "../../../../lib/publicUrl";
import { getBotInviteUrl } from "../../../../lib/discordBot";
import { isPro, FREE_PLAN_LIMITS } from "../../../../lib/billing";
import { isWorkspaceOwner } from "../../../../lib/team";
import db from "../../../../lib/db";

export async function GET(req) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.redirect(publicUrl("/login", req));
  }

  if (!isWorkspaceOwner(user.userId)) {
    return NextResponse.redirect(
      publicUrl("/connect?error=Only the workspace owner can manage connections", req)
    );
  }

  if (!isPro(user.userId)) {
    const count = db
      .prepare("SELECT COUNT(*) as c FROM connections WHERE user_id = ?")
      .get(user.userId).c;
    if (count >= FREE_PLAN_LIMITS.maxConnections) {
      return NextResponse.redirect(publicUrl("/billing?error=Free plan connection limit reached", req));
    }
  }

  // Reuse the existing oauth_pkce_state table purely to tie this invite
  // back to the logged-in user when Discord redirects back — there's no
  // real PKCE exchange for a bot-scope invite, so code_verifier is unused.
  const state = crypto.randomUUID();
  db.prepare(
    `INSERT INTO oauth_pkce_state (state, code_verifier, user_id, provider, expires_at)
     VALUES (?, '', ?, 'discord_bot', ?)`
  ).run(state, user.userId, Date.now() + 10 * 60 * 1000);

  return NextResponse.redirect(getBotInviteUrl(state, publicUrl("/api/auth/discord-bot/callback", req).toString()));
}
