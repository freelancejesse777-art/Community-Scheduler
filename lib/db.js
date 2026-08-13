// lib/db.js
// SQLite database layer. Zero external setup required — the DB file is
// created automatically on first run at ./data/app.db

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "app.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  onboarding_completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  platform TEXT NOT NULL,           -- 'reddit', 'discord', 'mastodon', 'telegram', 'bluesky'
  account_label TEXT,               -- e.g. reddit username, discord channel name, mastodon @user@instance
  access_token TEXT,
  refresh_token TEXT,
  webhook_url TEXT,                 -- used for discord (webhook-based posting)
  credential_json TEXT,             -- generic JSON blob for platform-specific secrets (mastodon token+instance, telegram bot token+chat id, bluesky handle+app password)
  expires_at INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free',         -- 'free' | 'pro'
  status TEXT DEFAULT 'active',     -- 'active' | 'canceled' | 'past_due'
  current_period_end TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT,
  base_content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  connection_id INTEGER NOT NULL,
  destination TEXT NOT NULL,        -- e.g. subreddit name "r/SaaS"
  adapted_content TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,      -- ISO timestamp
  status TEXT DEFAULT 'pending',    -- pending | posted | failed
  result_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (connection_id) REFERENCES connections(id)
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS oauth_pkce_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state TEXT UNIQUE NOT NULL,
  code_verifier TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- A "team" is one owner's shared workspace. Every user implicitly owns
-- their own workspace (their existing connections/posts/etc, unchanged);
-- a row here only gets created once that user invites their first
-- collaborator. Members see and act on the owner's data, not their own.
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  user_id INTEGER,               -- filled in once the invite is accepted
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',    -- the owner isn't stored here — tracked via teams.owner_user_id
  status TEXT DEFAULT 'pending', -- 'pending' | 'active' | 'removed'
  invite_token TEXT UNIQUE,
  expires_at INTEGER,
  invited_at TEXT DEFAULT CURRENT_TIMESTAMP,
  joined_at TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// Migration: older databases created before this column existed won't have
// it — add it if missing so existing deployments don't break.
const connectionColumns = db.prepare("PRAGMA table_info(connections)").all();
if (!connectionColumns.some((c) => c.name === "credential_json")) {
  db.exec("ALTER TABLE connections ADD COLUMN credential_json TEXT");
}

// Migration: engagement-tracking columns for post history & analytics.
// platform_post_id/posted_url are captured at post time (when the platform's
// API hands one back). The engagement_* columns are filled in later by an
// on-demand refresh, since most platforms don't return stats at post time.
const scheduledPostColumns = db.prepare("PRAGMA table_info(scheduled_posts)").all();
const scheduledPostColumnNames = new Set(scheduledPostColumns.map((c) => c.name));
const scheduledPostMigrations = [
  ["platform_post_id", "TEXT"],       // platform-native id for the live post, if returned
  ["posted_url", "TEXT"],             // link to the live post, if constructible
  ["engagement_score", "INTEGER"],    // upvotes / favourites / reactions, platform-dependent
  ["engagement_comments", "INTEGER"], // replies / comments, platform-dependent
  ["engagement_checked_at", "TEXT"],  // ISO timestamp of the last successful refresh
  ["engagement_error", "TEXT"],       // last error message from a refresh attempt, if any
];
for (const [name, type] of scheduledPostMigrations) {
  if (!scheduledPostColumnNames.has(name)) {
    db.exec(`ALTER TABLE scheduled_posts ADD COLUMN ${name} ${type}`);
  }
}

// Migration: onboarding tracking for users created before this column existed.
const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some((c) => c.name === "onboarding_completed_at")) {
  db.exec("ALTER TABLE users ADD COLUMN onboarding_completed_at TEXT");
}

module.exports = db;
