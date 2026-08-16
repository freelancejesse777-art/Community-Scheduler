import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/session";
import { isWorkspaceOwner } from "../../../../../lib/team";
import { listGuildTextChannels } from "../../../../../lib/discordBot";

export async function GET(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (!isWorkspaceOwner(user.userId)) {
    return NextResponse.json({ error: "Only the workspace owner can manage connections." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const guildId = searchParams.get("guildId");
  if (!guildId) return NextResponse.json({ error: "Missing guildId" }, { status: 400 });

  try {
    const channels = await listGuildTextChannels(guildId);
    return NextResponse.json({ channels });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
