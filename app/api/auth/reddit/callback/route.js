import { NextResponse } from "next/server";
import db from "../../../../../lib/db";
import { exchangeRedditCode } from "../../../../../lib/reddit";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  let userId;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(new URL("/connect?error=bad_state", req.url));
  }

  try {
    const tokens = await exchangeRedditCode(code);
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    db.prepare(
      `INSERT INTO connections (user_id, platform, account_label, access_token, refresh_token, expires_at)
       VALUES (?, 'reddit', ?, ?, ?, ?)`
    ).run(userId, "reddit-account", tokens.access_token, tokens.refresh_token, expiresAt);

    return NextResponse.redirect(new URL("/connect?connected=reddit", req.url));
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/connect?error=${encodeURIComponent(String(err.message))}`, req.url)
    );
  }
}
