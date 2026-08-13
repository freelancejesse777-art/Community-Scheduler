import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { checkRateLimit, getClientKey } from "../../../lib/rateLimit";
import { logError } from "../../../lib/logger";

export async function POST(req) {
  const rl = checkRateLimit(`feedback:${getClientKey(req)}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const { message, email, pageUrl } = await req.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Feedback message is required." }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "That's a lot of feedback — try trimming it under 5000 characters." }, { status: 400 });
  }

  const user = getCurrentUser();

  try {
    db.prepare(
      `INSERT INTO feedback (user_id, email, message, page_url) VALUES (?, ?, ?, ?)`
    ).run(user?.userId || null, user?.email || email || null, message.trim(), pageUrl || null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError(err, { context: "feedback submit" });
    return NextResponse.json({ error: "Couldn't submit feedback. Try again in a moment." }, { status: 500 });
  }
}

// Simple admin gate — no roles/permissions system for the app as a whole,
// so this just checks the logged-in user's email against ADMIN_EMAIL.
export async function GET() {
  const user = getCurrentUser();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!user || !adminEmail || user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const items = db
    .prepare(
      `SELECT f.id, f.email, f.message, f.page_url, f.created_at, u.email as user_email
       FROM feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC
       LIMIT 200`
    )
    .all();

  return NextResponse.json({ items });
}
