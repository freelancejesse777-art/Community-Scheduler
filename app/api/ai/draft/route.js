import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { adaptContentForDestination } from "../../../../lib/ai";
import { checkSelfPromoRisk } from "../../../../lib/reddit";
import { checkRateLimit } from "../../../../lib/rateLimit";

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const rl = checkRateLimit(`ai-draft:${user.userId}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "AI drafting rate limit reached. Try again in a bit." },
      { status: 429 }
    );
  }

  const { baseContent, destination, destinationNotes } = await req.json();
  if (!baseContent || !destination) {
    return NextResponse.json(
      { error: "baseContent and destination are required" },
      { status: 400 }
    );
  }

  try {
    const adapted = await adaptContentForDestination({
      baseContent,
      destination,
      destinationNotes,
    });
    const riskCheck = checkSelfPromoRisk(adapted);

    return NextResponse.json({ adapted, riskCheck });
  } catch (err) {
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
