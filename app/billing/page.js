"use client";
import { useEffect, useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setMessage({ ok: true, text: "You're on Pro now. Thanks!" });
    if (params.get("canceled")) setMessage({ ok: false, text: "Checkout canceled." });
  }, []);

  async function upgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setMessage({ ok: false, text: err.message });
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Billing</h1>
      <p className="subtitle">Free tier is limited. Pro removes the limits.</p>

      {message && <p className={message.ok ? "success" : "error"}>{message.text}</p>}

      <div className="card">
        <strong>Free</strong>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          1 connection, 5 scheduled posts per month.
        </p>
      </div>

      <div className="card">
        <strong>Pro</strong>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Unlimited connections and scheduled posts, AI drafting included.
        </p>
        <button onClick={upgrade} disabled={loading}>
          {loading ? "Redirecting..." : "Upgrade to Pro"}
        </button>
      </div>
    </div>
  );
}
