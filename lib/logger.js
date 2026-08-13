// lib/logger.js
// Structured logging. Logs JSON lines to console (visible in your host's
// log viewer — Vercel, Railway, Render all capture stdout automatically).
// If SENTRY_DSN is set, also forwards errors to Sentry for alerting.
//
// This is a minimal manual integration, not the official @sentry/nextjs
// SDK — no source maps, breadcrumbs, or session tracking. It's enough to
// get real alerts into a Sentry project during beta without adding a new
// dependency. If you want the full SDK later, run
// `npx @sentry/wizard@latest -i nextjs` and it'll replace this.

const crypto = require("crypto");

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

// Parses a standard Sentry DSN (https://<publicKey>@<host>/<projectId>)
// into the pieces needed to POST directly to Sentry's store endpoint.
function parseDsn(dsn) {
  const url = new URL(dsn);
  const publicKey = url.username;
  const projectId = url.pathname.replace(/^\//, "");
  if (!publicKey || !projectId) return null;
  return {
    publicKey,
    storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
  };
}

async function forwardToSentry(error, context) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const parsed = parseDsn(dsn);
    if (!parsed) return;

    const eventId = crypto.randomBytes(16).toString("hex"); // Sentry wants a 32-char hex id

    await fetch(parsed.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=community-scheduler-logger/1.0, sentry_key=${parsed.publicKey}`,
      },
      body: JSON.stringify({
        event_id: eventId,
        timestamp: Date.now() / 1000,
        platform: "node",
        level: "error",
        message: String(error.message || error),
        exception: error.stack
          ? { values: [{ type: error.name || "Error", value: String(error.message || error), stacktrace: { frames: [] } }] }
          : undefined,
        extra: context,
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
