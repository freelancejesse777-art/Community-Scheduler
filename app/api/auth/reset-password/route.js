import { NextResponse } from "next/server";
import { consumePasswordResetToken, updateUserPassword } from "../../../../lib/auth";
import { checkRateLimit, getClientKey } from "../../../../lib/rateLimit";

export async function POST(req) {
  const rl = checkRateLimit(`reset-password:${getClientKey(req)}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { token, newPassword } = await req.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const userId = consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  updateUserPassword(userId, newPassword);
  return NextResponse.json({ ok: true });
}
