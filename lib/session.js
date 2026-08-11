// lib/session.js
const { cookies } = require("next/headers");
const { verifySession } = require("./auth");

function getCurrentUser() {
  const token = cookies().get("session")?.value;
  if (!token) return null;
  return verifySession(token); // { userId, email } or null
}

module.exports = { getCurrentUser };
