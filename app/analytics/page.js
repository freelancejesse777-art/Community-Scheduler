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
};

function platformLabel(p) {
  return PLATFORM_LABELS[p] || p;
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/analytics");
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setData(body);
    } catch (err) {
      setLoadError(err.message === "Failed to fetch" ? "Couldn't reach the server." : err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshEngagement() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/analytics/refresh", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Refresh failed.");
      setRefreshMsg(
        body.refreshed === 0
          ? "Nothing to refresh right now."
          : `Updated ${body.refreshed} post${body.refreshed === 1 ? "" : "s"}.`
      );
      await load();
    } catch (err) {
      setRefreshMsg(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (loadError) {
    return (
      <div>
        <h1>Analytics</h1>
        <p className="error">{loadError}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1>Analytics</h1>
        <p className="subtitle">Loading...</p>
      </div>
    );
  }

  const { summary, byPlatform, timeline, topPosts, history } = data;
  const maxTimelineCount = Math.max(1, ...timeline.map((d) => d.count));
  const hasAnyEngagementSupport = history.some((h) => h.engagementSupported);

  return (
    <div>
      <h1>Analytics</h1>
      <p className="subtitle">How your scheduled posts are doing, across every connection.</p>

      {summary.totalPosts === 0 && (
        <div className="card">
          Nothing scheduled yet — head to <a href="/compose">Compose</a> to write your first post.
        </div>
      )}

      {summary.totalPosts > 0 && (
        <>
          <div className="card" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <SummaryStat label="Total posts" value={summary.totalPosts} />
            <SummaryStat label="Posted" value={summary.postedCount} />
            <SummaryStat label="Pending" value={summary.pendingCount} />
            <SummaryStat label="Failed" value={summary.failedCount} />
            <SummaryStat
              label="Success rate"
              value={summary.successRate === null ? "—" : `${summary.successRate}%`}
            />
          </div>

          <div className="card">
            <strong>Last 14 days</strong>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, marginTop: 16 }}>
              {timeline.map((d) => (
                <div key={d.date} style={{ flex: 1, textAlign: "center" }} title={`${d.date}: ${d.count}`}>
                  <div
                    style={{
                      background: d.count > 0 ? "var(--accent)" : "var(--line)",
                      height: `${Math.max(4, (d.count / maxTimelineCount) * 64)}px`,
                      borderRadius: 3,
                    }}
                  />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
              {timeline[0]?.date} &mdash; {timeline[timeline.length - 1]?.date}
            </p>
          </div>

          <div className="card">
            <strong>By platform</strong>
            {byPlatform.map((p) => (
              <div key={p.platform} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{platformLabel(p.platform)}</span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{p.total} total</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                  Posted: {p.posted || 0} · Pending: {p.pending || 0} · Failed: {p.failed || 0}
                </p>
              </div>
            ))}
          </div>

          {topPosts.length > 0 && (
            <div className="card">
              <strong>Top performing posts</strong>
              {topPosts.map((t) => (
                <div key={t.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{t.destination}</strong>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      {t.engagement_score ?? 0} pts · {t.engagement_comments ?? 0} comments
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                    {platformLabel(t.platform)}
                    {t.posted_url && (
                      <>
                        {" · "}
                        <a href={t.posted_url} target="_blank" rel="noreferrer">
                          view post
                        </a>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Post history</strong>
              {hasAnyEngagementSupport && (
                <button type="button" className="secondary" onClick={refreshEngagement} disabled={refreshing}>
                  {refreshing ? "Refreshing..." : "Refresh engagement"}
                </button>
              )}
            </div>
            {refreshMsg && <p style={{ fontSize: 12, color: "var(--muted)" }}>{refreshMsg}</p>}
            {!hasAnyEngagementSupport && (
              <p style={{ fontSize: 12, color: "var(--muted)" }}>
                Engagement numbers are available for Reddit, Mastodon, Lemmy, and Bluesky posts. Other platforms
                will still show up here, just without live stats.
              </p>
            )}

            {history.map((h) => (
              <div key={h.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{h.destination}</strong>
                  <span className={`pill ${h.status}`}>{h.status}</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                  {platformLabel(h.platform)} · {new Date(h.scheduled_for).toLocaleString()}
                  {h.result_message ? ` · ${h.result_message}` : ""}
                </p>
                {h.status === "posted" && h.engagementSupported && (
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                    {h.engagement_checked_at
                      ? `${h.engagement_score ?? 0} pts · ${h.engagement_comments ?? 0} comments`
                      : "Not checked yet"}
                    {h.engagement_error ? ` · last refresh failed: ${h.engagement_error}` : ""}
                  </p>
                )}
                {h.posted_url && (
                  <p style={{ fontSize: 12, margin: "4px 0 0" }}>
                    <a href={h.posted_url} target="_blank" rel="noreferrer">
                      view live post
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
