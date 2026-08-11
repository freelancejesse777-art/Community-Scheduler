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
`);

// Migration: older databases created before this column existed won't have
// it — add it if missing so existing deployments don't break.
const connectionColumns = db.prepare("PRAGMA table_info(connections)").all();
if (!connectionColumns.some((c) => c.name === "credential_json")) {
  db.exec("ALTER TABLE connections ADD COLUMN credential_json TEXT");
}

module.exports = db;
