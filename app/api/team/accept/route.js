import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { acceptInvite } from "../../../../lib/team";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "You need to be logged in to accept an invite." }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Missing invite token." }, { status: 400 });

  try {
    const ownerUserId = acceptInvite(token, user);
    return NextResponse.json({ ok: true, ownerUserId });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 });
  }
}
