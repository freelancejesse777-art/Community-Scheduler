import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { exportUserData } from "../../../../lib/account";
import { logError } from "../../../../lib/logger";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  try {
    const data = exportUserData(user.userId);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="community-scheduler-export-${user.userId}.json"`,
      },
    });
  } catch (err) {
    logError(err, { context: "account export", userId: user.userId });
    return NextResponse.json({ error: "Couldn't export your data. Try again in a moment." }, { status: 500 });
  }
}
