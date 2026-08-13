"use client";
import { useEffect, useState } from "react";

export default function QueuePage() {
  const [scheduled, setScheduled] = useState([]);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setScheduled(d.scheduled || []));
  }, []);

  return (
    <div>
      <h1>Queue</h1>
      <p className="subtitle">Everything scheduled, posted, or failed.</p>

      {scheduled.length === 0 && (
        <div className="card">
          <strong>Nothing scheduled yet</strong>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "8px 0 16px" }}>
            Write something in Compose or build a multi-destination Campaign, and it'll show up here.
          </p>
          <a href="/compose">
            <button type="button">Go to Compose</button>
          </a>
          <a href="/campaigns">
            <button type="button" className="secondary">
              Go to Campaigns
            </button>
          </a>
        </div>
      )}

      {scheduled.map((s) => (
        <div className="card" key={s.id}>
          <div>
            <strong>{s.destination}</strong>
            <span className={`pill ${s.status}`}>{s.status}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Scheduled for {new Date(s.scheduled_for).toLocaleString()}
          </p>
          <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>
            {s.adapted_content}
          </p>
          {s.result_message && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              {s.result_message}
            </p>
          )}
          {s.posted_url && (
            <p style={{ fontSize: 12 }}>
              <a href={s.posted_url} target="_blank" rel="noreferrer">
                view live post
              </a>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
