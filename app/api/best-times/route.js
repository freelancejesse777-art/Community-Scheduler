import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { getWorkspaceOwnerId } from "../../../lib/team";
import { engagementSupported } from "../../../lib/engagement";
import { computePersonalBestTimes, getGenericBestTime } from "../../../lib/bestTimes";
import { logError } from "../../../lib/logger";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  try {
    const ownerId = getWorkspaceOwnerId(user.userId);
    const connectedPlatforms = db
      .prepare("SELECT DISTINCT platform FROM connections WHERE user_id = ?")
      .all(ownerId)
      .map((r) => r.platform);

    if (connectedPlatforms.length === 0) {
      return NextResponse.json({ platforms: [] });
    }

    const platforms = connectedPlatforms.map((platform) => {
      let personal = null;

      if (engagementSupported(platform)) {
        const rows = db
          .prepare(
            `SELECT sp.scheduled_for, sp.engagement_score
             FROM scheduled_posts sp
             JOIN posts p ON p.id = sp.post_id
             JOIN connections c ON c.id = sp.connection_id
             WHERE p.user_id = ? AND c.platform = ? AND sp.status = 'posted'
               AND sp.engagement_score IS NOT NULL`
          )
          .all(ownerId, platform);
        personal = computePersonalBestTimes(rows);
      }

      return {
        platform,
        source: personal ? "personalized" : "generic",
        personalSuggestions: personal,
        generic: getGenericBestTime(platform),
      };
    });

    return NextResponse.json({ platforms });
  } catch (err) {
    logError(err, { context: "best-times route", userId: user.userId });
    return NextResponse.json(
      { error: "Couldn't load posting-time suggestions. Try again in a moment." },
      { status: 500 }
    );
  }
}
