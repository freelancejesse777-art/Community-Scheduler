import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/session";
import { adaptContentForDestination } from "../../../../../lib/ai";
import { checkSelfPromoRisk } from "../../../../../lib/reddit";
import { checkRateLimit } from "../../../../../lib/rateLimit";

// A campaign fans one post out to many destinations — cap it so a single
// request can't take forever or blow through the AI rate limit on its own.
const MAX_DESTINATIONS = 12;

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { baseContent, destinations } = await req.json();
  if (!baseContent || !Array.isArray(destinations) || destinations.length === 0) {
    return NextResponse.json(
      { error: "baseContent and a non-empty destinations array are required" },
      { status: 400 }
    );
  }
  if (destinations.length > MAX_DESTINATIONS) {
    return NextResponse.json(
      { error: `A campaign can adapt to at most ${MAX_DESTINATIONS} destinations at once.` },
      { status: 400 }
    );
  }

  const results = [];

  for (const dest of destinations) {
    if (!dest.destination) {
      results.push({ ...dest, error: "Missing destination" });
      continue;
    }

    const rl = checkRateLimit(`ai-draft:${user.userId}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      results.push({
        ...dest,
        error: "AI drafting rate limit reached for this hour — the rest of this batch was skipped. Try again later.",
      });
      continue;
    }

    try {
      const adapted = await adaptContentForDestination({
        baseContent,
        destination: dest.destination,
        destinationNotes: dest.destinationNotes,
      });
      const riskCheck = checkSelfPromoRisk(adapted);
      results.push({ ...dest, adapted, riskCheck });
    } catch (err) {
      results.push({ ...dest, error: String(err.message || err) });
    }
  }

  return NextResponse.json({ results });
}
