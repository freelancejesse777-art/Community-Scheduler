import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { isWorkspaceOwner, removeMember } from "../../../../lib/team";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!isWorkspaceOwner(user.userId)) {
    return NextResponse.json({ error: "Only the workspace owner can remove members." }, { status: 403 });
  }

  const { memberId } = await req.json();
  if (!memberId) return NextResponse.json({ error: "Missing memberId." }, { status: 400 });

  try {
    removeMember(user.userId, memberId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 400 });
  }
}
