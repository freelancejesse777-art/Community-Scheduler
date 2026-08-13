"use client";
import { useState } from "react";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          email: email || undefined,
          pageUrl: document.referrer || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't submit feedback.");
      setResult({ ok: true, text: "Thanks — got it." });
      setMessage("");
    } catch (err) {
      setResult({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Feedback</h1>
      <p className="subtitle">Bug, confusing moment, or a feature you wish existed — all useful. Doesn't need to be polished.</p>

      <div className="card">
        <form onSubmit={submit}>
          <label>What's going on</label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. The Calendar page didn't load my scheduled posts from yesterday..."
          />

          <label>Email (optional, in case we want to follow up)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

          {result && <p className={result.ok ? "success" : "error"}>{result.text}</p>}

          <button type="submit" disabled={loading || !message.trim()}>
            {loading ? "Sending..." : "Send feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
