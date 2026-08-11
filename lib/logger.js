// lib/logger.js
// Structured logging. Logs JSON lines to console (visible in your host's
// log viewer — Vercel, Railway, Render all capture stdout automatically).
// If SENTRY_DSN is set, also forwards errors to Sentry for alerting.
//
// This does NOT install the Sentry SDK for you — if you want real Sentry
// integration, run `npm install @sentry/nextjs` and follow their setup
// wizard (`npx @sentry/wizard@latest -i nextjs`), which will replace the
// forwardToSentry stub below with a real client. What's here is a
// lightweight placeholder so error visibility exists even before you do that.

function log(level, message, meta = {}) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

async function forwardToSentry(error, context) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  // Minimal manual Sentry envelope POST — a placeholder until you install
  // @sentry/nextjs properly. Swap this out once you do.
  try {
    await fetch(dsn.replace("https://", "https://o0.ingest.sentry.io/api/0/store/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(error.message || error),
        extra: context,
        timestamp: Date.now() / 1000,
      }),
    }).catch(() => {}); // never let logging itself crash the request
  } catch {
    // swallow — logging must never break the app
  }
}

function logError(error, context = {}) {
  log("error", String(error.message || error), { stack: error.stack, ...context });
  forwardToSentry(error, context);
}

function logInfo(message, meta = {}) {
  log("info", message, meta);
}

function logWarn(message, meta = {}) {
  log("warn", message, meta);
}

module.exports = { logError, logInfo, logWarn };
