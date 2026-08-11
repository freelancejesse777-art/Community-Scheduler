import { NextResponse } from "next/server";
import db from "../../../../../lib/db";
import { exchangeTwitterCode } from "../../../../../lib/twitter";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  const pkceRow = db
    .prepare("SELECT * FROM oauth_pkce_state WHERE state = ? AND provider = 'twitter'")
    .get(state);

  if (!pkceRow || pkceRow.expires_at < Date.now()) {
    return NextResponse.redirect(
      new URL("/connect?error=Login session expired, try connecting again", req.url)
    );
  }

  // One-time use — clean up immediately
  db.prepare("DELETE FROM oauth_pkce_state WHERE id = ?").run(pkceRow.id);

  try {
    const tokens = await exchangeTwitterCode(code, pkceRow.code_verifier);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    db.prepare(
      `INSERT INTO connections (user_id, platform, account_label, access_token, refresh_token, expires_at)
       VALUES (?, 'twitter', 'X account', ?, ?, ?)`
    ).run(pkceRow.user_id, tokens.access_token, tokens.refresh_token, expiresAt);

    return NextResponse.redirect(new URL("/connect?connected=X", req.url));
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(String(err.message))}`, req.url)
    );
  }
}
