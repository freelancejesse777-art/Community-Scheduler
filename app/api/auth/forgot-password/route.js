import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { createPasswordResetToken } from "../../../../lib/auth";
import { sendEmail } from "../../../../lib/email";
import { checkRateLimit, getClientKey } from "../../../../lib/rateLimit";

export async function POST(req) {
  const rl = checkRateLimit(`forgot-password:${getClientKey(req)}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { email } = await req.json();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  // Always return the same response whether or not the email exists —
  // otherwise this endpoint leaks which emails are registered.
  if (user) {
    const token = createPasswordResetToken(user.id);
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Click this link to reset your password (expires in 1 hour): ${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is registered, a reset link has been sent.",
  });
}
