import { NextResponse } from "next/server";
import { verifyUser, signSession } from "../../../../lib/auth";
import { checkRateLimit, getClientKey } from "../../../../lib/rateLimit";

export async function POST(req) {
  const rl = checkRateLimit(`login:${getClientKey(req)}`, {
    limit: 8,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const { email, password } = await req.json();
  const user = verifyUser(email, password);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = signSession(user);
  const res = NextResponse.json({ ok: true, email: user.email });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
