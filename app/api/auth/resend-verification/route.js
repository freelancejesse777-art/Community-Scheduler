import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { createEmailVerificationToken } from "../../../../lib/auth";
import { sendEmail } from "../../../../lib/email";
import { checkRateLimit } from "../../../../lib/rateLimit";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const rl = checkRateLimit(`resend-verify:${user.userId}`, {
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const token = createEmailVerificationToken(user.userId);
  const origin = req.headers.get("origin") || "http://localhost:3000";

  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    text: `Verify your email here: ${origin}/api/auth/verify-email?token=${token}\n\nThis link expires in 24 hours.`,
  });

  return NextResponse.json({ ok: true });
}
