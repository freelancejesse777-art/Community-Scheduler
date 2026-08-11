// lib/rateLimit.js
// Simple in-memory sliding-window rate limiter. Good enough for a single
// server instance. If you scale to multiple instances/regions, swap this
// for a shared store (Redis, Upstash) — in-memory counts won't be shared
// across processes.

const buckets = new Map(); // key -> [timestamps]

function checkRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = buckets.get(key) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true };
}

// Periodically clear old buckets so memory doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets.entries()) {
    const fresh = timestamps.filter((t) => t > now - 60 * 60 * 1000);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}, 10 * 60 * 1000).unref?.();

function getClientKey(req) {
  // Best-effort client identifier behind a proxy (Vercel/most hosts set this)
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

module.exports = { checkRateLimit, getClientKey };
