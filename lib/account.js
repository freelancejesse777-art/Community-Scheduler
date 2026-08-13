// lib/account.js
const db = require("./db");
const { isWorkspaceOwner, activeMemberCount } = require("./team");

// Returns a JSON-serializable snapshot of everything this account can see
// as "theirs" — full workspace content for an owner, just their own
// profile + membership for a team member (workspace content belongs to
// the owner, not the member, so it isn't included here).
function exportUserData(userId) {
  const user = db.prepare("SELECT id, email, email_verified, created_at, onboarding_completed_at FROM users WHERE id = ?").get(userId);
  if (!user) throw new Error("Account not found.");

  const owner = isWorkspaceOwner(userId);

  const base = { account: user, isWorkspaceOwner: owner };

  if (!owner) {
    const membership = db
      .prepare(
        `SELECT tm.role, tm.status, tm.invited_at, tm.joined_at, u.email as workspace_owner_email
         FROM team_members tm
         JOIN teams t ON t.id = tm.team_id
         JOIN users u ON u.id = t.owner_user_id
         WHERE tm.user_id = ? AND tm.status = 'active'`
      )
      .get(userId);
    return { ...base, membership: membership || null };
  }

  // Connections: redact actual secrets (tokens, webhook URLs, credential
  // blobs) — the point of an export is showing someone their own data,
  // not handing back live credentials in a downloadable file.
  const connections = db
    .prepare("SELECT id, platform, account_label, created_at FROM connections WHERE user_id = ?")
    .all(userId);

  const posts = db.prepare("SELECT id, title, base_content, created_at FROM posts WHERE user_id = ?").all(userId);

  const scheduledPosts = db
    .prepare(
      `SELECT sp.id, sp.destination, sp.adapted_content, sp.scheduled_for, sp.status, sp.result_message,
              sp.posted_url, sp.engagement_score, sp.engagement_comments, sp.created_at, c.platform
       FROM scheduled_posts sp
       JOIN posts p ON p.id = sp.post_id
       JOIN connections c ON c.id = sp.connection_id
       WHERE p.user_id = ?`
    )
    .all(userId);

  const subscription = db.prepare("SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ?").get(userId);

  const teamMembers = db
    .prepare(
      `SELECT tm.email, tm.role, tm.status, tm.invited_at, tm.joined_at
       FROM team_members tm JOIN teams t ON t.id = tm.team_id
       WHERE t.owner_user_id = ? AND tm.status != 'removed'`
    )
    .all(userId);

  return { ...base, connections, posts, scheduledPosts, subscription: subscription || null, teamMembers };
}

// Deletes an account and everything it owns. Workspace owners with active
// (or pending) team members must remove them first — deleting out from
// under collaborators would silently break their access with no warning,
// so we require an explicit, separate step instead.
function deleteUserAccount(userId) {
  const owner = isWorkspaceOwner(userId);

  if (owner && activeMemberCount(userId) > 0) {
    throw new Error(
      "You have teammates in your workspace — remove them from the Team page before deleting your account."
    );
  }

  const run = db.transaction(() => {
    if (owner) {
      // Full workspace cascade: everything this account owns.
      db.prepare(
        `DELETE FROM scheduled_posts WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)`
      ).run(userId);
      db.prepare("DELETE FROM posts WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM connections WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM subscriptions WHERE user_id = ?").run(userId);

      const team = db.prepare("SELECT id FROM teams WHERE owner_user_id = ?").get(userId);
      if (team) {
        db.prepare("DELETE FROM team_members WHERE team_id = ?").run(team.id);
        db.prepare("DELETE FROM teams WHERE id = ?").run(team.id);
      }
    } else {
      // Just their own membership elsewhere, if any.
      db.prepare("DELETE FROM team_members WHERE user_id = ?").run(userId);
    }

    // Account-level rows that always belong solely to this user, regardless of role.
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM oauth_pkce_state WHERE user_id = ?").run(userId);
    // Feedback is kept for product history but anonymized rather than deleted.
    db.prepare("UPDATE feedback SET user_id = NULL WHERE user_id = ?").run(userId);

    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  run();
}

module.exports = { exportUserData, deleteUserAccount };
