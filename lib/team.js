// lib/team.js
// A "team" is just a shared workspace: one owner's connections, posts,
// campaigns, and analytics, opened up to invited collaborators. There's no
// separate team-owned data model — members simply act on the owner's
// existing resources. This keeps every existing table/route untouched in
// shape; the only new concept is "which user_id should this request use."

const crypto = require("crypto");
const db = require("./db");

const MAX_TEAM_MEMBERS = 10; // active members, not counting the owner
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// The single most important function in this file: given the logged-in
// user, returns the user_id whose workspace they should be operating in.
// If they're an active member of someone else's team, that's the owner's
// id. Otherwise it's their own id (the common, unchanged case).
function getWorkspaceOwnerId(userId) {
  const membership = db
    .prepare(
      `SELECT t.owner_user_id FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id = ? AND tm.status = 'active'`
    )
    .get(userId);
  return membership ? membership.owner_user_id : userId;
}

// True if this user is acting on their own workspace (i.e. not a member of
// someone else's team). Connection management and billing are restricted
// to workspace owners.
function isWorkspaceOwner(userId) {
  return getWorkspaceOwnerId(userId) === userId;
}

function getOrCreateTeam(ownerUserId) {
  let team = db.prepare("SELECT * FROM teams WHERE owner_user_id = ?").get(ownerUserId);
  if (!team) {
    db.prepare("INSERT INTO teams (owner_user_id) VALUES (?)").run(ownerUserId);
    team = db.prepare("SELECT * FROM teams WHERE owner_user_id = ?").get(ownerUserId);
  }
  return team;
}

function listTeamMembers(ownerUserId) {
  const team = db.prepare("SELECT * FROM teams WHERE owner_user_id = ?").get(ownerUserId);
  if (!team) return [];
  return db
    .prepare(
      `SELECT id, email, role, status, invited_at, joined_at
       FROM team_members WHERE team_id = ? AND status != 'removed'
       ORDER BY invited_at ASC`
    )
    .all(team.id);
}

function activeMemberCount(ownerUserId) {
  const team = db.prepare("SELECT * FROM teams WHERE owner_user_id = ?").get(ownerUserId);
  if (!team) return 0;
  return db
    .prepare("SELECT COUNT(*) as c FROM team_members WHERE team_id = ? AND status IN ('active','pending')")
    .get(team.id).c;
}

function createInvite(ownerUserId, email) {
  const team = getOrCreateTeam(ownerUserId);
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare(
    `INSERT INTO team_members (team_id, email, invite_token, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(team.id, email.toLowerCase(), token, Date.now() + INVITE_EXPIRY_MS);
  return token;
}

// Returns the pending team_members row for a token, or null if missing/expired.
function getPendingInvite(token) {
  const row = db
    .prepare("SELECT * FROM team_members WHERE invite_token = ? AND status = 'pending'")
    .get(token);
  if (!row) return null;
  if (row.expires_at && row.expires_at < Date.now()) return null;
  return row;
}

function acceptInvite(token, user) {
  const invite = getPendingInvite(token);
  if (!invite) throw new Error("This invite link is invalid or has expired.");

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite was sent to a different email address.");
  }

  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(invite.team_id);
  if (team.owner_user_id === user.userId) {
    throw new Error("You can't join your own workspace as a member.");
  }
  if (!isWorkspaceOwner(user.userId)) {
    throw new Error("You're already part of another workspace — leave it first before joining a new one.");
  }

  db.prepare(
    "UPDATE team_members SET user_id = ?, status = 'active', joined_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(user.userId, invite.id);

  return team.owner_user_id;
}

function removeMember(ownerUserId, memberId) {
  const team = db.prepare("SELECT * FROM teams WHERE owner_user_id = ?").get(ownerUserId);
  if (!team) throw new Error("No team found.");
  const info = db
    .prepare("UPDATE team_members SET status = 'removed' WHERE id = ? AND team_id = ?")
    .run(memberId, team.id);
  if (info.changes === 0) throw new Error("Member not found.");
}

function leaveTeam(userId) {
  db.prepare(
    "UPDATE team_members SET status = 'removed' WHERE user_id = ? AND status = 'active'"
  ).run(userId);
}

// For display: if this user is a member (not owner), who owns the
// workspace they're currently in.
function getMembershipInfo(userId) {
  const membership = db
    .prepare(
      `SELECT t.owner_user_id, u.email as owner_email FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       JOIN users u ON u.id = t.owner_user_id
       WHERE tm.user_id = ? AND tm.status = 'active'`
    )
    .get(userId);
  return membership || null;
}

module.exports = {
  MAX_TEAM_MEMBERS,
  getWorkspaceOwnerId,
  isWorkspaceOwner,
  getOrCreateTeam,
  listTeamMembers,
  activeMemberCount,
  createInvite,
  getPendingInvite,
  acceptInvite,
  removeMember,
  leaveTeam,
  getMembershipInfo,
};
