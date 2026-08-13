import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { createCheckoutSession } from "../../../../lib/billing";
import { isWorkspaceOwner } from "../../../../lib/team";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  if (!isWorkspaceOwner(user.userId)) {
    return NextResponse.json(
      { error: "Only the workspace owner can manage billing." },
      { status: 403 }
    );
  }

  const origin = req.headers.get("origin") || "http://localhost:3000";

  try {
    const session = await createCheckoutSession(
      user,
      `${origin}/billing?success=1`,
      `${origin}/billing?canceled=1`
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
