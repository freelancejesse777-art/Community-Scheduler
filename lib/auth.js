// lib/auth.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("./db");

// Deliberately NOT cached in a module-level const — read process.env
// inside each function at call time. See the note in lib/ai.js for why
// this matters; for a session-signing secret specifically, the stakes
// are higher than a broken feature — a stale/wrong value here would mean
// sessions get signed with a fallback secret instead of the real one.
function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

function createUser(email, password) {
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(
    "INSERT INTO users (email, password_hash) VALUES (?, ?)"
  );
  const info = stmt.run(email, hash);
  return { id: info.lastInsertRowid, email };
}

function verifyUser(email, password) {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return null;
  const ok = bcrypt.compareSync(password, user.password_hash);
  return ok ? user : null;
}

function signSession(user) {
  return jwt.sign({ userId: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: "30d",
  });
}

function verifySession(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  db.prepare(
    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(userId, token, expiresAt);
  return token;
}

function consumePasswordResetToken(token) {
  const row = db
    .prepare("SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0")
    .get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;

  db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(row.id);
  return row.user_id;
}

function updateUserPassword(userId, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
}

function createEmailVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  db.prepare(
    "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(userId, token, expiresAt);
  return token;
}

function consumeEmailVerificationToken(token) {
  const row = db
    .prepare("SELECT * FROM email_verification_tokens WHERE token = ? AND used = 0")
    .get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;

  db.prepare("UPDATE email_verification_tokens SET used = 1 WHERE id = ?").run(row.id);
  db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(row.user_id);
  return row.user_id;
}

module.exports = {
  createUser,
  verifyUser,
  signSession,
  verifySession,
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPassword,
  createEmailVerificationToken,
  consumeEmailVerificationToken,
};
