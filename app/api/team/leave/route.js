import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { leaveTeam } from "../../../../lib/team";

export async function POST() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  leaveTeam(user.userId);
  return NextResponse.json({ ok: true });
}
