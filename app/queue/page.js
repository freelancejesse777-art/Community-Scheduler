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
        <div className="card">Nothing scheduled yet — go to Compose.</div>
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
        </div>
      ))}
    </div>
  );
}
