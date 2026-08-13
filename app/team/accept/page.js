"use client";
import { useEffect, useState } from "react";

export default function AcceptInvitePage() {
  const [status, setStatus] = useState("checking"); // checking | needs-login | accepting | done | error
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setStatus("error");
      setMessage("This invite link is missing its token.");
      return;
    }
    setToken(t);
    accept(t);
  }, []);

  async function accept(t) {
    setStatus("accepting");
    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const body = await res.json();
      if (res.status === 401) {
        setStatus("needs-login");
        return;
      }
      if (!res.ok) throw new Error(body.error || "Couldn't accept this invite.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  return (
    <div>
      <h1>Team invite</h1>

      {status === "checking" || status === "accepting" ? <p className="subtitle">Working on it...</p> : null}

      {status === "needs-login" && (
        <div className="card">
          <p>You need to log in (or sign up) with the email this invite was sent to before you can accept it.</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Once you're logged in, come back to this exact link to finish joining.
          </p>
          <a href="/login">
            <button type="button">Go to login</button>
          </a>
        </div>
      )}

      {status === "done" && (
        <div className="card">
          <p className="success">You're in! You now have access to that workspace.</p>
          <a href="/dashboard">
            <button type="button">Go to dashboard</button>
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="card">
          <p className="error">{message}</p>
        </div>
      )}
    </div>
  );
}
