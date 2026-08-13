"use client";
import { useEffect, useState } from "react";
import { PlatformBadge } from "../icons";

export default function ConnectPage() {
  const [status, setStatus] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setStatus({ ok: true, msg: `Connected ${params.get("connected")}!` });
    if (params.get("error")) setStatus({ ok: false, msg: params.get("error") });
    fetch("/api/team")
      .then((r) => r.json())
      .then(setTeamInfo)
      .catch(() => {});
  }, []);

  const onDone = (name) => () => setStatus({ ok: true, msg: `Connected ${name}!` });

  return (
    <div>
      <h1>Connections</h1>
      <p className="subtitle">
        Connect the communities you're already a real, active member of.
      </p>

      {teamInfo && !teamInfo.isOwner && (
        <div className="warning">
          You're working in {teamInfo.workspaceOwnerEmail}'s workspace — only they can add or remove
          connections. You can still use everything they've connected.
        </div>
      )}

      {status && (
        <p className={status.ok ? "success" : "error"}>{status.msg}</p>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <PlatformBadge platform="reddit" />
          <strong>Reddit</strong>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Lets you post to subreddits you're subscribed to, using your own
          account and your own OAuth token. Nothing posts without you
          explicitly scheduling it.
        </p>
        <a href="/api/auth/reddit">
          <button>Connect Reddit</button>
        </a>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <PlatformBadge platform="twitter" />
          <strong>X (Twitter)</strong>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          X moved to pay-per-use pricing — roughly $0.015 per post charged
          to your own X developer account (more if your post has a link).
          No monthly minimum, but you'll need credits loaded in your X
          developer console.
        </p>
        <a href="/api/auth/twitter">
          <button>Connect X</button>
        </a>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <PlatformBadge platform="tiktok" />
          <strong>TikTok</strong>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          TikTok posts need a photo (not just text) — you'll be asked for an
          image URL when scheduling. Until your TikTok developer app passes
          their review, posts land as a private draft in your TikTok inbox;
          you'll need to open the TikTok app to actually publish them.
        </p>
        <a href="/api/auth/tiktok">
          <button>Connect TikTok</button>
        </a>
      </div>

      <DiscordConnect onDone={onDone("Discord")} />
      <MastodonConnect onDone={onDone("Mastodon")} />
      <BlueskyConnect onDone={onDone("Bluesky")} />
      <TelegramConnect onDone={onDone("Telegram")} />
      <LemmyConnect onDone={onDone("Lemmy")} />
      <FacebookConnect onDone={onDone("Facebook Page")} />
    </div>
  );
}

function ConnectForm({ title, platform, description, fields, endpoint, buttonLabel, onDone }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setValues({});
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
        <PlatformBadge platform={platform} />
        <strong>{title}</strong>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>{description}</p>
      <form onSubmit={submit}>
        {fields.map((f) => (
          <div key={f.name}>
            <label>{f.label}</label>
            <input
              type={f.type || "text"}
              value={values[f.name] || ""}
              onChange={(e) => setField(f.name, e.target.value)}
              placeholder={f.placeholder}
            />
          </div>
        ))}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : buttonLabel}
        </button>
      </form>
    </div>
  );
}

function DiscordConnect({ onDone }) {
  return (
    <ConnectForm
      title="Discord"
      platform="discord"
      description={`In the Discord channel you want to post to: Channel Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL. No bot install or server admin approval needed.`}
      endpoint="/api/auth/discord"
      buttonLabel="Connect Discord channel"
      onDone={onDone}
      fields={[
        { name: "label", label: 'Label (e.g. "my-server #announcements")' },
        { name: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
      ]}
    />
  );
}

function MastodonConnect({ onDone }) {
  return (
    <ConnectForm
      title="Mastodon"
      platform="mastodon"
      description={`Works with any instance. Go to your instance → Preferences → Development → New Application, grant "write:statuses" scope, then copy the access token here.`}
      endpoint="/api/auth/mastodon"
      buttonLabel="Connect Mastodon"
      onDone={onDone}
      fields={[
        { name: "instanceUrl", label: "Instance URL", placeholder: "https://mastodon.social" },
        { name: "accessToken", label: "Access token" },
      ]}
    />
  );
}

function BlueskyConnect({ onDone }) {
  return (
    <ConnectForm
      title="Bluesky"
      platform="bluesky"
      description={`Generate an app password from Settings → App Passwords (not your real account password — it's revocable separately).`}
      endpoint="/api/auth/bluesky"
      buttonLabel="Connect Bluesky"
      onDone={onDone}
      fields={[
        { name: "handle", label: "Handle", placeholder: "yourname.bsky.social" },
        { name: "appPassword", label: "App password", type: "password" },
      ]}
    />
  );
}

function TelegramConnect({ onDone }) {
  return (
    <ConnectForm
      title="Telegram"
      platform="telegram"
      description={`Message @BotFather on Telegram to create a bot (takes under a minute, no approval needed), add it as an admin to your channel or group, then paste the bot token and chat ID here.`}
      endpoint="/api/auth/telegram"
      buttonLabel="Connect Telegram"
      onDone={onDone}
      fields={[
        { name: "label", label: 'Label (e.g. "my channel")' },
        { name: "botToken", label: "Bot token", placeholder: "123456:ABC-DEF..." },
        { name: "chatId", label: "Chat ID", placeholder: "@yourchannel or -100123456789" },
      ]}
    />
  );
}

function LemmyConnect({ onDone }) {
  return (
    <ConnectForm
      title="Lemmy"
      platform="lemmy"
      description={`Federated, Reddit-style communities — no app registration needed, just your instance login. Works with any Lemmy instance (lemmy.world, lemmy.ml, or a self-hosted one).`}
      endpoint="/api/auth/lemmy"
      buttonLabel="Connect Lemmy"
      onDone={onDone}
      fields={[
        { name: "instanceUrl", label: "Instance URL", placeholder: "https://lemmy.world" },
        { name: "username", label: "Username" },
        { name: "password", label: "Password", type: "password" },
      ]}
    />
  );
}

function FacebookConnect({ onDone }) {
  return (
    <ConnectForm
      title="Facebook Page"
      platform="facebook"
      description={`Meta requires App Review + Business Verification (weeks) before an app can post to Pages it doesn't own — until you clear that, this only works for your own Page. Generate a long-lived Page Access Token via Graph API Explorer (developers.facebook.com/tools/explorer): select your app and Page, grant pages_manage_posts + pages_read_engagement + pages_show_list, generate, then extend it to long-lived via the Access Token Debugger before pasting it here.`}
      endpoint="/api/auth/facebook"
      buttonLabel="Connect Facebook Page"
      onDone={onDone}
      fields={[
        { name: "pageId", label: "Page ID" },
        { name: "pageAccessToken", label: "Page Access Token", type: "password" },
      ]}
    />
  );
}
