import { NextResponse } from "next/server";
import { publicUrl } from "../../../../../lib/publicUrl";
import db from "../../../../../lib/db";
import { exchangeTikTokCode } from "../../../../../lib/tiktok";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      publicUrl(`/connect?error=${encodeURIComponent(error)}`, req)
    );
  }

  const pkceRow = db
    .prepare("SELECT * FROM oauth_pkce_state WHERE state = ? AND provider = 'tiktok'")
    .get(state);

  if (!pkceRow || pkceRow.expires_at < Date.now()) {
    return NextResponse.redirect(
      publicUrl("/connect?error=Login session expired, try connecting again", req)
    );
  }

  // One-time use — clean up immediately
  db.prepare("DELETE FROM oauth_pkce_state WHERE id = ?").run(pkceRow.id);

  try {
    const tokens = await exchangeTikTokCode(code, pkceRow.code_verifier);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    db.prepare(
      `INSERT INTO connections (user_id, platform, account_label, access_token, refresh_token, expires_at)
       VALUES (?, 'tiktok', 'TikTok account', ?, ?, ?)`
    ).run(pkceRow.user_id, tokens.access_token, tokens.refresh_token, expiresAt);

    return NextResponse.redirect(publicUrl("/connect?connected=TikTok", req));
  } catch (err) {
    return NextResponse.redirect(
      publicUrl(`/connect?error=${encodeURIComponent(String(err.message))}`, req)
    );
  }
}
