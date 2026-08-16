"use client";
import { useEffect, useState, useCallback } from "react";

const PLATFORM_LABELS = {
  reddit: "Reddit",
  discord: "Discord",
  mastodon: "Mastodon",
  telegram: "Telegram",
  bluesky: "Bluesky",
  twitter: "X",
  facebook: "Facebook",
  lemmy: "Lemmy",
  tiktok: "TikTok",
  discord_bot: "Discord (Bot)",
};

export default function BestTimesPage() {
  const [platforms, setPlatforms] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/best-times");
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setPlatforms(body.platforms || []);
    } catch (err) {
      setLoadError(err.message === "Failed to fetch" ? "Couldn't reach the server." : err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <div>
        <h1>Best times to post</h1>
        <p className="error">{loadError}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }

  if (!platforms) {
    return (
      <div>
        <h1>Best times to post</h1>
        <p className="subtitle">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Best times to post</h1>
      <p className="subtitle">
        Personalized once you've got enough posting history on a platform; general guidance until then.
      </p>

      {platforms.length === 0 && (
        <div className="card">
          Connect an account on the <a href="/connect">Connections</a> page to see suggestions.
        </div>
      )}

      {platforms.map((p) => (
        <div className="card" key={p.platform}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <strong>{PLATFORM_LABELS[p.platform] || p.platform}</strong>
            <span className="pill" style={p.source === "personalized" ? { background: "#e2f0e6", color: "var(--success)" } : {}}>
              {p.source === "personalized" ? "Personalized" : "General guidance"}
            </span>
          </div>

          {p.source === "personalized" ? (
            <>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0" }}>
                Based on your own posting history, these windows have gotten the best engagement:
              </p>
              {p.personalSuggestions.map((s, i) => (
                <div key={i} style={{ padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                  <strong>{s.label}</strong>
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>
                    avg {s.avgScore} pts across {s.sampleCount} post{s.sampleCount === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <>
              <p style={{ margin: "8px 0 4px", fontWeight: 600, fontSize: 14 }}>{p.generic.label}</p>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{p.generic.note}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
