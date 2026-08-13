"use client";
import { useEffect, useState, useCallback } from "react";

export default function TeamPage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/team");
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setData(body);
    } catch (err) {
      setLoadError(err.message === "Failed to fetch" ? "Couldn't reach the server." : err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendInvite() {
    setMessage(null);
    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't send invite.");
      setMessage({ ok: true, text: `Invite sent to ${email}.` });
      setEmail("");
      load();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId) {
    if (!window.confirm("Remove this teammate? They'll lose access to your workspace.")) return;
    setMessage(null);
    try {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't remove member.");
      load();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    }
  }

  async function leaveWorkspace() {
    if (!window.confirm("Leave this workspace? You'll go back to your own, empty workspace.")) return;
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't leave.");
      window.location.href = "/dashboard";
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    }
  }

  if (loadError) {
    return (
      <div>
        <h1>Team</h1>
        <p className="error">{loadError}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1>Team</h1>
        <p className="subtitle">Loading...</p>
      </div>
    );
  }

  if (!data.isOwner) {
    return (
      <div>
        <h1>Team</h1>
        <p className="subtitle">
          You're a member of <strong>{data.workspaceOwnerEmail}</strong>'s workspace. Everything you see across
          Compose, Campaigns, Queue, Calendar, and Analytics belongs to that workspace.
        </p>
        {message && <p className={message.ok ? "success" : "error"}>{message.text}</p>}
        <div className="card">
          <button type="button" className="secondary" onClick={leaveWorkspace}>
            Leave this workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Team</h1>
      <p className="subtitle">Invite collaborators to work in your workspace — they'll share your connections, posts, and queue.</p>

      {message && <p className={message.ok ? "success" : "error"}>{message.text}</p>}

      {!data.isPro && (
        <div className="warning">
          Team members are a Pro feature. <a href="/billing">Upgrade to Pro</a> to invite collaborators.
        </div>
      )}

      <div className="card">
        <label>Invite by email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
        <button type="button" onClick={sendInvite} disabled={inviting || !email || !data.isPro}>
          {inviting ? "Sending..." : "Send invite"}
        </button>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
          They'll need to sign up (or already have an account) with this exact email to accept.
        </p>
      </div>

      <div className="card">
        <strong>Members ({data.members.length}/{data.maxTeamMembers})</strong>
        {data.members.length === 0 && (
          <p style={{ fontSize: 14, color: "var(--muted)" }}>No teammates yet.</p>
        )}
        {data.members.map((m) => (
          <div key={m.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong>{m.email}</strong>
              <span className={`pill ${m.status === "active" ? "posted" : "pending"}`}>{m.status}</span>
            </div>
            <button type="button" className="secondary" style={{ marginTop: 0, width: "auto" }} onClick={() => removeMember(m.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
