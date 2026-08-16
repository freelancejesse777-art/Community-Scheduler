"use client";
import { useEffect, useState, useCallback } from "react";

let nextRowId = 1;
function newRow() {
  return {
    key: nextRowId++,
    connectionId: "",
    destination: "",
    destinationNotes: "",
    scheduledFor: "",
    tiktokImageUrl: "",
    adapted: "",
    riskCheck: null,
    error: null,
  };
}

const PLATFORM_LABELS = {
  reddit: "Reddit",
  discord: "Discord",
  tiktok: "TikTok",
  discord_bot: "Discord (Bot)",
  mastodon: "Mastodon",
  telegram: "Telegram",
  bluesky: "Bluesky",
  twitter: "X",
  facebook: "Facebook",
  lemmy: "Lemmy",
};

export default function CampaignsPage() {
  const [connections, setConnections] = useState([]);
  const [bestTimes, setBestTimes] = useState([]);
  const [title, setTitle] = useState("");
  const [baseContent, setBaseContent] = useState("");
  const [rows, setRows] = useState([newRow(), newRow()]);
  const [staggerStart, setStaggerStart] = useState("");
  const [staggerIntervalMinutes, setStaggerIntervalMinutes] = useState(60);
  const [adapting, setAdapting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsError, setCampaignsError] = useState(null);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []));
    fetch("/api/best-times")
      .then((r) => r.json())
      .then((d) => setBestTimes(d.platforms || []))
      .catch(() => {});
  }, []);

  const loadCampaigns = useCallback(async () => {
    setCampaignsError(null);
    try {
      const res = await fetch("/api/campaigns");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't load campaigns.");
      setCampaigns(body.campaigns || []);
    } catch (err) {
      setCampaignsError(err.message);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  function updateRow(key, field, value) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(key) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function applyStagger() {
    if (!staggerStart) return;
    const start = new Date(staggerStart).getTime();
    const intervalMs = (Number(staggerIntervalMinutes) || 0) * 60 * 1000;
    setRows((rs) =>
      rs.map((r, i) => {
        const t = new Date(start + i * intervalMs);
        // datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time
        const localIso = new Date(t.getTime() - t.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        return { ...r, scheduledFor: localIso };
      })
    );
  }

  async function adaptAll() {
    setMessage(null);
    const validRows = rows.filter((r) => r.destination.trim());
    if (!baseContent || validRows.length === 0) {
      setMessage({ ok: false, text: "Write your base content and at least one destination first." });
      return;
    }

    setAdapting(true);
    try {
      const res = await fetch("/api/ai/draft/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseContent,
          destinations: validRows.map((r) => ({
            destination: r.destination,
            destinationNotes: r.destinationNotes,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Adapting failed.");

      // Results come back in the same order as validRows — merge them
      // back into the full rows array by matching position.
      let resultIdx = 0;
      setRows((rs) =>
        rs.map((r) => {
          if (!r.destination.trim()) return r;
          const result = body.results[resultIdx];
          resultIdx += 1;
          if (!result) return r;
          return {
            ...r,
            adapted: result.adapted || r.adapted,
            riskCheck: result.riskCheck || null,
            error: result.error || null,
          };
        })
      );
      const failCount = body.results.filter((r) => r.error).length;
      setMessage(
        failCount > 0
          ? { ok: false, text: `${failCount} of ${body.results.length} destinations failed to adapt — see details below.` }
          : { ok: true, text: `Adapted all ${body.results.length} destinations.` }
      );
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setAdapting(false);
    }
  }

  async function scheduleCampaign() {
    setMessage(null);
    // TikTok rows need an image URL instead of a destination name — see
    // the note on the Connect page.
    const rowIsReady = (r) => {
      const platform = connections.find((c) => String(c.id) === String(r.connectionId))?.platform;
      const hasDestinationValue = platform === "tiktok" ? r.tiktokImageUrl.trim() : r.destination.trim();
      return hasDestinationValue && r.connectionId && r.adapted && r.scheduledFor;
    };
    const readyRows = rows.filter(rowIsReady);
    if (readyRows.length === 0) {
      setMessage({ ok: false, text: "Each destination needs a connection, adapted content, and a schedule time before you can launch." });
      return;
    }

    setScheduling(true);
    try {
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, baseContent }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.error);

      const schedRes = await fetch("/api/schedule/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postData.postId,
          items: readyRows.map((r) => {
            const platform = connections.find((c) => String(c.id) === String(r.connectionId))?.platform;
            return {
              connectionId: r.connectionId,
              destination: platform === "tiktok" ? r.tiktokImageUrl : r.destination,
              adaptedContent: r.adapted,
              scheduledFor: new Date(r.scheduledFor).toISOString(),
            };
          }),
        }),
      });
      const schedData = await schedRes.json();
      if (!schedRes.ok) throw new Error(schedData.error);

      setMessage({ ok: true, text: `Campaign launched — ${readyRows.length} posts scheduled. Check below or the Queue page.` });
      setTitle("");
      setBaseContent("");
      setRows([newRow(), newRow()]);
      loadCampaigns();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div>
      <h1>Campaigns</h1>
      <p className="subtitle">Write once. Adapt for every community. Schedule the whole batch at once.</p>

      <div className="card">
        <label>Campaign title (used as the Reddit title, and to identify this batch)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>What you want to say</label>
        <textarea
          value={baseContent}
          onChange={(e) => setBaseContent(e.target.value)}
          placeholder="Write your update, launch, or announcement here..."
        />
      </div>

      <div className="card">
        <strong>Destinations</strong>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Add every community you want this adapted for. Each gets its own AI-adapted draft and its own schedule time.
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 12 }}>
          <div style={{ flex: "1 1 160px" }}>
            <label>Stagger starting at</label>
            <input type="datetime-local" value={staggerStart} onChange={(e) => setStaggerStart(e.target.value)} />
          </div>
          <div style={{ flex: "1 1 120px" }}>
            <label>Minutes apart</label>
            <input
              type="number"
              min="0"
              value={staggerIntervalMinutes}
              onChange={(e) => setStaggerIntervalMinutes(e.target.value)}
            />
          </div>
          <button type="button" className="secondary" onClick={applyStagger} disabled={!staggerStart}>
            Auto-fill times
          </button>
        </div>

        {rows.map((r, i) => (
          <div key={r.key} style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <strong style={{ fontSize: 13 }}>Destination {i + 1}</strong>
              {rows.length > 1 && (
                <button type="button" className="secondary" style={{ marginTop: 0, padding: "4px 10px", width: "auto" }} onClick={() => removeRow(r.key)}>
                  Remove
                </button>
              )}
            </div>

            <label>Connected account</label>
            <select value={r.connectionId} onChange={(e) => updateRow(r.key, "connectionId", e.target.value)}>
              <option value="">Select a connection</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {PLATFORM_LABELS[c.platform] || c.platform} ({c.account_label})
                </option>
              ))}
            </select>

            <label>Destination (e.g. r/SaaS)</label>
            <input value={r.destination} onChange={(e) => updateRow(r.key, "destination", e.target.value)} placeholder="r/SaaS" />

            <label>Notes about this community (optional)</label>
            <input
              value={r.destinationNotes}
              onChange={(e) => updateRow(r.key, "destinationNotes", e.target.value)}
              placeholder="e.g. casual tone, hates hard selling"
            />

            {connections.find((c) => String(c.id) === String(r.connectionId))?.platform === "tiktok" && (
              <>
                <label>Image URL to post (TikTok requires a photo, not just text)</label>
                <input
                  value={r.tiktokImageUrl}
                  onChange={(e) => updateRow(r.key, "tiktokImageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </>
            )}

            <label>Schedule for</label>
            <input type="datetime-local" value={r.scheduledFor} onChange={(e) => updateRow(r.key, "scheduledFor", e.target.value)} />
            {(() => {
              const platform = connections.find((c) => String(c.id) === String(r.connectionId))?.platform;
              const hint = bestTimes.find((b) => b.platform === platform);
              if (!hint) return null;
              const label = hint.source === "personalized" ? hint.personalSuggestions[0].label : hint.generic.label;
              return (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  💡 {hint.source === "personalized" ? "Your best-performing window: " : "Suggested window: "}
                  {label}
                </p>
              );
            })()}

            {r.error && <p className="error">{r.error}</p>}

            {r.adapted && (
              <>
                <label>Adapted draft (editable)</label>
                <textarea value={r.adapted} onChange={(e) => updateRow(r.key, "adapted", e.target.value)} />
                {r.riskCheck && (
                  <div className="warning">
                    {r.riskCheck.risky ? "⚠️ " : "ℹ️ "}
                    {r.riskCheck.note}
                    {r.riskCheck.matchedPhrases?.length > 0 && (
                      <div>Flagged phrases: {r.riskCheck.matchedPhrases.join(", ")}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        <button type="button" className="secondary" onClick={addRow}>
          + Add destination
        </button>
        <button type="button" onClick={adaptAll} disabled={adapting || !baseContent}>
          {adapting ? "Adapting..." : "AI-adapt all"}
        </button>
        <button type="button" onClick={scheduleCampaign} disabled={scheduling}>
          {scheduling ? "Launching..." : "Schedule campaign"}
        </button>

        {message && <p className={message.ok ? "success" : "error"}>{message.text}</p>}
      </div>

      <div className="card">
        <strong>Your campaigns</strong>
        {campaignsError && <p className="error">{campaignsError}</p>}
        {!campaignsError && campaigns.length === 0 && (
          <p style={{ fontSize: 14, color: "var(--muted)" }}>No campaigns yet — build one above.</p>
        )}
        {campaigns.map((c) => (
          <div key={c.postId} style={{ padding: "14px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <strong>{c.title || "(untitled)"}</strong>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {c.postedCount}/{c.destinationCount} posted
                {c.failedCount > 0 ? ` · ${c.failedCount} failed` : ""}
                {c.pendingCount > 0 ? ` · ${c.pendingCount} pending` : ""}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 10px" }}>
              {new Date(c.createdAt).toLocaleString()}
            </p>
            {c.items.map((item) => (
              <div key={item.id} style={{ padding: "6px 0", fontSize: 13 }}>
                <span>{PLATFORM_LABELS[item.platform] || item.platform}</span> ·{" "}
                <span>{item.destination}</span>
                <span className={`pill ${item.status}`}>{item.status}</span>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {new Date(item.scheduledFor).toLocaleString()}
                  {item.resultMessage ? ` · ${item.resultMessage}` : ""}
                  {item.postedUrl && (
                    <>
                      {" · "}
                      <a href={item.postedUrl} target="_blank" rel="noreferrer">
                        view post
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
