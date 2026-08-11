"use client";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      window.location.href = "/connect";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(e) {
    e.preventDefault();
    setError("");
    setForgotMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForgotMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "forgot") {
    return (
      <div>
        <h1>Reset your password</h1>
        <div className="card">
          <form onSubmit={submitForgot}>
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            {forgotMessage && <p className="success">{forgotMessage}</p>}
            <button type="submit" disabled={loading}>
              {loading ? "..." : "Send reset link"}
            </button>
            <button type="button" className="secondary" onClick={() => setMode("login")}>
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>{mode === "login" ? "Log in" : "Sign up"}</h1>
      <p className="subtitle">
        {mode === "login" ? "Welcome back." : "Takes about 10 seconds."}
      </p>
      <div className="card">
        <form onSubmit={submit}>
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
          </button>
          {mode === "login" && (
            <button type="button" className="secondary" onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
