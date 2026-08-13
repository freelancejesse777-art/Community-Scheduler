import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { deleteUserAccount } from "../../../../lib/account";
import { logError } from "../../../../lib/logger";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text didn't match." }, { status: 400 });
  }

  try {
    deleteUserAccount(user.userId);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    // deleteUserAccount throws a plain, user-facing Error for the
    // "remove your team first" case — anything else is unexpected.
    if (err.message.includes("teammates")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    logError(err, { context: "account delete", userId: user.userId });
    return NextResponse.json({ error: "Couldn't delete your account. Try again in a moment." }, { status: 500 });
  }
}
