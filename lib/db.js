// lib/db.js
// SQLite database layer. Zero external setup required — the DB file is
// created automatically on first run at ./data/app.db

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { PHASE_PRODUCTION_BUILD } = require("next/constants");

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// During `next build`'s "collecting page data" step, Next imports every
// route module just to inspect its exports/config — it never actually
// invokes the handlers. But every route file imports this module, and
// opening the SQLite file + running the full schema/migration script as
// an import-time side effect meant dozens of build workers ended up
// racing to open and migrate the same file at once, causing SQLITE_BUSY
// crashes that had nothing to do with real traffic. So: skip all of it
// during the build phase and hand back a stub that would loudly fail if
// anything ever actually tried to use it (it shouldn't). Real runtime
// (`next start`) still opens and migrates the database exactly once per
// process, same as before.
const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

let db;

if (isBuildPhase) {
  // A plain empty object, not a throwing proxy — Next's build tooling
  // does harmless property probing on every imported module (ESM/CJS
  // interop checks like `.default`, `.then`, etc.) even for modules it
  // never truly calls into, and a proxy that throws on any property
  // access breaks on those checks too. An empty object lets those reads
  // return undefined harmlessly; if something ever genuinely tried to
  // call a real method (e.g. db.prepare(...)) during build, it'd still
  // fail loudly with a clear "not a function" error.
  db = {};
} else {
  db = new Database(path.join(dataDir, "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 10000");
  // This app was never built to handle foreign-key constraint violations
  // (no code anywhere catches or cleans up after them), so pin this off
  // explicitly rather than leaving it to whatever the platform's SQLite
  // build defaults to — some environments compile SQLite with foreign
  // keys enforced by default, others don't, and that mismatch is exactly
  // what caused "FOREIGN KEY constraint failed" errors on reads that
  // never should have touched constraint checking at all.
  db.pragma("foreign_keys = OFF");

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

  // Helper used by every migration below — safe to run even if something
  // unexpected still races it, though the build-phase skip above should
  // make that impossible now. If we lose a race, SQLite reports "duplicate
  // column name" — that just means it was already added, fine to ignore.
  const safeAddColumn = (table, name, type) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    } catch (err) {
      if (!/duplicate column name/i.test(err.message)) throw err;
    }
  };

  // Migration: older databases created before this column existed won't have
  // it — add it if missing so existing deployments don't break.
  const connectionColumns = db.prepare("PRAGMA table_info(connections)").all();
  if (!connectionColumns.some((c) => c.name === "credential_json")) {
    safeAddColumn("connections", "credential_json", "TEXT");
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
      safeAddColumn("scheduled_posts", name, type);
    }
  }

  // Migration: onboarding tracking for users created before this column existed.
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  if (!userColumns.some((c) => c.name === "onboarding_completed_at")) {
    safeAddColumn("users", "onboarding_completed_at", "TEXT");
  }
}

module.exports = db;
