import { NextResponse } from "next/server";
import { runDueScheduledPosts } from "../../../lib/scheduler";
import { checkRateLimit, getClientKey } from "../../../lib/rateLimit";

// Call this endpoint from an external cron (e.g. a free cron pinger, or
// Vercel Cron if you deploy there) every few minutes. It finds any
// scheduled_posts rows that are due and submits them.
export async function POST(req) {
  const rl = checkRateLimit(`run-scheduler:${getClientKey(req)}`, {
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runDueScheduledPosts();
  return NextResponse.json({ ok: true, results });
}
