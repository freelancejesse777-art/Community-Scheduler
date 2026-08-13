"use client";
import { useEffect, useState, useCallback } from "react";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState(null);
  const [resending, setResending] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoadError(null);
    setData(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/dashboard", { signal: controller.signal });
      clearTimeout(timeoutId);

      let body;
      try {
        body = await res.json();
      } catch {
        throw new Error("The server sent back something unexpected. Try again in a moment.");
      }

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        throw new Error(body.error || `Something went wrong (${res.status}).`);
      }

      setData(body);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setLoadError("This is taking too long — the server may be slow or unreachable.");
      } else if (err.message === "Failed to fetch") {
        setLoadError("Couldn't reach the server — check your connection and try again.");
      } else {
        setLoadError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    fetch("/api/onboarding/status")
      .then((r) => r.json())
      .then(setOnboarding)
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get("verify") === "success") setVerifyMsg({ ok: true, text: "Email verified!" });
    if (params.get("verify") === "invalid") setVerifyMsg({ ok: false, text: "That verification link is invalid or expired." });
  }, [loadDashboard]);

  async function dismissOnboarding() {
    setDismissing(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
      setOnboarding((o) => ({ ...o, dismissed: true }));
    } finally {
      setDismissing(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setVerifyMsg({ ok: true, text: "Verification email sent — check your inbox." });
    } catch (err) {
      setVerifyMsg({ ok: false, text: err.message });
    } finally {
      setResending(false);
    }
  }

  if (loadError) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p className="error">{loadError}</p>
        <button onClick={loadDashboard}>Try again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p className="subtitle">Loading...</p>
      </div>
    );
  }

  const statusMap = Object.fromEntries((data.statusCounts || []).map((s) => [s.status, s.c]));

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="subtitle">
        Plan: <strong>{data.plan === "pro" ? "Pro" : "Free"}</strong>
        {data.plan !== "pro" && <> — <a href="/billing">upgrade</a></>}
      </p>

      {verifyMsg && <p className={verifyMsg.ok ? "success" : "error"}>{verifyMsg.text}</p>}

      {!data.emailVerified && (
        <div className="warning">
          Your email isn't verified yet.{" "}
          <button
            type="button"
            className="secondary"
            style={{ marginTop: 8, marginLeft: 0 }}
            onClick={resendVerification}
            disabled={resending}
          >
            {resending ? "Sending..." : "Resend verification email"}
          </button>
        </div>
      )}

      {onboarding && !onboarding.dismissed && onboarding.isWorkspaceOwner && (!onboarding.hasConnection || !onboarding.hasScheduled) && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Getting started</strong>
            <button type="button" className="secondary" style={{ marginTop: 0 }} onClick={dismissOnboarding} disabled={dismissing}>
              Dismiss
            </button>
          </div>
          <ChecklistItem done={onboarding.hasConnection} label="Connect an account" href="/connect" />
          <ChecklistItem done={onboarding.hasScheduled} label="Schedule your first post" href="/compose" />
          <ChecklistItem done={onboarding.hasPosted} label="See it go live" href="/queue" />
        </div>
      )}

      {onboarding && !onboarding.dismissed && !onboarding.isWorkspaceOwner && (
        <div className="card">
          <strong>Getting started</strong>
          <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>
            You're working in a shared workspace — head to <a href="/compose">Compose</a> to write your first post,
            using connections your workspace owner already set up.
          </p>
        </div>
      )}

      <div className="card">
        <strong>Usage</strong>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          {data.connectionsCount} connection{data.connectionsCount === 1 ? "" : "s"}
          {data.plan !== "pro" && ` (limit: ${data.limits.maxConnections})`}
        </p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          {data.scheduledThisMonth} scheduled this month
          {data.plan !== "pro" && ` (limit: ${data.limits.maxScheduledPostsPerMonth})`}
        </p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          Posted: {statusMap.posted || 0} · Pending: {statusMap.pending || 0} · Failed: {statusMap.failed || 0}
        </p>
      </div>

      <div className="card">
        <strong>Recent activity</strong>
        {(data.recentActivity || []).length === 0 && (
          <p style={{ fontSize: 14, color: "var(--muted)" }}>Nothing yet.</p>
        )}
        {(data.recentActivity || []).map((a, i) => (
          <div key={i} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
            <div>
              <strong>{a.destination}</strong>
              <span className={`pill ${a.status}`}>{a.status}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
              {a.platform} · {new Date(a.scheduled_for).toLocaleString()}
              {a.result_message ? ` · ${a.result_message}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({ done, label, href }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <span style={{ fontSize: 14, color: done ? "var(--success)" : "var(--ink)" }}>
        {done ? "✓ " : "○ "}
        {label}
      </span>
      {!done && (
        <a href={href}>
          <button type="button" className="secondary" style={{ marginTop: 0, padding: "4px 10px" }}>
            Go
          </button>
        </a>
      )}
    </div>
  );
}
