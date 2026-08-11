"use client";
import { useState, useEffect } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ ok: true, text: "Password updated. You can log in now." });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Reset password</h1>
      <div className="card">
        {!token && <p className="error">No reset token found in the URL.</p>}
        <form onSubmit={submit}>
          <label>New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {message && (
            <p className={message.ok ? "success" : "error"}>{message.text}</p>
          )}
          <button type="submit" disabled={loading || !token}>
            {loading ? "..." : "Set new password"}
          </button>
        </form>
        {message?.ok && (
          <a href="/login"><button className="secondary">Go to login</button></a>
        )}
      </div>
    </div>
  );
}
