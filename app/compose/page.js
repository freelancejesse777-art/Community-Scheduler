"use client";
import { useEffect, useState } from "react";

export default function ComposePage() {
  const [connections, setConnections] = useState([]);
  const [bestTimes, setBestTimes] = useState([]);
  const [baseContent, setBaseContent] = useState("");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationNotes, setDestinationNotes] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [tiktokImageUrl, setTiktokImageUrl] = useState("");
  const [adapted, setAdapted] = useState("");
  const [riskCheck, setRiskCheck] = useState(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []));
    fetch("/api/best-times")
      .then((r) => r.json())
      .then((d) => setBestTimes(d.platforms || []))
      .catch(() => {});
  }, []);

  async function draft() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseContent, destination, destinationNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdapted(data.adapted);
      setRiskCheck(data.riskCheck);
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function scheduleIt() {
    setLoading(true);
    setMessage(null);
    try {
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, baseContent }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) throw new Error(postData.error);

      // TikTok's "destination" is an image URL, not a community name —
      // see the note on the Connect page. Every other platform keeps
      // using the community/channel name entered above.
      const selectedPlatform = connections.find((c) => String(c.id) === String(connectionId))?.platform;
      const destinationToSend = selectedPlatform === "tiktok" ? tiktokImageUrl : destination;

      const schedRes = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postData.postId,
          connectionId,
          destination: destinationToSend,
          adaptedContent: adapted,
          scheduledFor: new Date(scheduledFor).toISOString(),
        }),
      });
      const schedData = await schedRes.json();
      if (!schedRes.ok) throw new Error(schedData.error);

      setMessage({ ok: true, text: "Scheduled! Check the Queue page." });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Compose</h1>
      <p className="subtitle">Write once. Adapt per community. Schedule it.</p>

      <div className="card">
        <label>Post title (used as the Reddit title)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>What you want to say</label>
        <textarea
          value={baseContent}
          onChange={(e) => setBaseContent(e.target.value)}
          placeholder="Write your update, launch, or announcement here..."
        />

        <label>Destination (e.g. r/SaaS)</label>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="r/SaaS"
        />

        <label>Notes about this community (optional)</label>
        <input
          value={destinationNotes}
          onChange={(e) => setDestinationNotes(e.target.value)}
          placeholder="e.g. casual tone, hates hard selling, likes detailed metrics"
        />

        <button onClick={draft} disabled={loading || !baseContent || !destination}>
          {loading ? "Adapting..." : "AI-adapt for this destination"}
        </button>
      </div>

      {adapted && (
        <div className="card">
          <strong>Adapted draft</strong>
          <textarea value={adapted} onChange={(e) => setAdapted(e.target.value)} />

          {riskCheck && (
            <div className="warning">
              {riskCheck.risky ? "⚠️ " : "ℹ️ "}
              {riskCheck.note}
              {riskCheck.matchedPhrases?.length > 0 && (
                <div>Flagged phrases: {riskCheck.matchedPhrases.join(", ")}</div>
              )}
            </div>
          )}

          <label>Post to which connected account?</label>
          <select value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
            <option value="">Select a connection</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.platform} ({c.account_label})
              </option>
            ))}
          </select>

          {connections.find((c) => String(c.id) === String(connectionId))?.platform === "tiktok" && (
            <>
              <label>Image URL to post (TikTok requires a photo, not just text)</label>
              <input
                value={tiktokImageUrl}
                onChange={(e) => setTiktokImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </>
          )}

          <label>Schedule for</label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
          {(() => {
            const platform = connections.find((c) => String(c.id) === String(connectionId))?.platform;
            const hint = bestTimes.find((b) => b.platform === platform);
            if (!hint) return null;
            const label = hint.source === "personalized" ? hint.personalSuggestions[0].label : hint.generic.label;
            return (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                💡 {hint.source === "personalized" ? "Your best-performing window: " : "Suggested window: "}
                {label} (see <a href="/best-times">Best Times</a>)
              </p>
            );
          })()}

          <button
            onClick={scheduleIt}
            disabled={
              loading ||
              !connectionId ||
              !scheduledFor ||
              (connections.find((c) => String(c.id) === String(connectionId))?.platform === "tiktok" && !tiktokImageUrl)
            }
          >
            {loading ? "Scheduling..." : "Schedule post"}
          </button>
        </div>
      )}

      {message && (
        <p className={message.ok ? "success" : "error"}>{message.text}</p>
      )}
    </div>
  );
}
