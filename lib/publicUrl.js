// lib/publicUrl.js
// Platforms like Railway put the app behind a reverse proxy that
// terminates the public domain and forwards requests to the app
// internally on its own port. Next.js's `req.url` reflects THAT internal
// address, not the public one — so `new NextResponse.redirect(new URL(path,
// req.url))` silently sends people to an internal host they can't reach
// (e.g. localhost:8080) instead of the real domain. Reverse proxies set
// X-Forwarded-Host/X-Forwarded-Proto to the original public request, so
// prefer those when present; fall back to req.url for local dev where
// there's no proxy in front of it.
function getPublicBaseUrl(req) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }
  return new URL(req.url).origin;
}

// Convenience wrapper for the common case: building a redirect URL for a
// given path against the correct public host.
function publicUrl(path, req) {
  return new URL(path, getPublicBaseUrl(req));
}

module.exports = { getPublicBaseUrl, publicUrl };
