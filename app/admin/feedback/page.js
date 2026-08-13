"use client";
import { useEffect, useState } from "react";

export default function AdminFeedbackPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Not authorized");
        setItems(body.items);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div>
        <h1>Feedback</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div>
        <h1>Feedback</h1>
        <p className="subtitle">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Feedback</h1>
      <p className="subtitle">{items.length} submission{items.length === 1 ? "" : "s"}, newest first.</p>

      {items.length === 0 && <div className="card">Nothing submitted yet.</div>}

      {items.map((f) => (
        <div className="card" key={f.id}>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{f.message}</p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, marginBottom: 0 }}>
            {new Date(f.created_at).toLocaleString()}
            {(f.user_email || f.email) ? ` · ${f.user_email || f.email}` : " · anonymous"}
            {f.page_url ? ` · from ${f.page_url}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
