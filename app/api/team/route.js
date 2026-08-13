import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/session";
import { isPro } from "../../../lib/billing";
import { isWorkspaceOwner, listTeamMembers, getMembershipInfo, MAX_TEAM_MEMBERS } from "../../../lib/team";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const isOwner = isWorkspaceOwner(user.userId);

  if (isOwner) {
    const members = listTeamMembers(user.userId);
    return NextResponse.json({
      isOwner: true,
      isPro: isPro(user.userId),
      maxTeamMembers: MAX_TEAM_MEMBERS,
      members,
    });
  }

  const membership = getMembershipInfo(user.userId);
  return NextResponse.json({
    isOwner: false,
    isPro: isPro(user.userId),
    workspaceOwnerEmail: membership?.owner_email || null,
  });
}
