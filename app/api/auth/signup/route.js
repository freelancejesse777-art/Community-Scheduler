import { NextResponse } from "next/server";
import { createUser, signSession, createEmailVerificationToken } from "../../../../lib/auth";
import { checkRateLimit, getClientKey } from "../../../../lib/rateLimit";
import { sendEmail } from "../../../../lib/email";
import { logError } from "../../../../lib/logger";

export async function POST(req) {
  const rl = checkRateLimit(`signup:${getClientKey(req)}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 }
    );
  }

  const { email, password } = await req.json();

  const emailValid = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValid || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    const user = createUser(email, password);
    const token = signSession(user);

    // Fire-and-forget verification email — don't block signup on it
    try {
      const verifyToken = createEmailVerificationToken(user.id);
      const origin = req.headers.get("origin") || "http://localhost:3000";
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: `Welcome! Verify your email here: ${origin}/api/auth/verify-email?token=${verifyToken}\n\nThis link expires in 24 hours.`,
      });
    } catch (emailErr) {
      logError(emailErr, { context: "signup verification email", userId: user.id });
      // Don't fail signup just because the email send failed
    }

    const res = NextResponse.json({ ok: true, email: user.email });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: "That email is already registered." },
      { status: 400 }
    );
  }
}
