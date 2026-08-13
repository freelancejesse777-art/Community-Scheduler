"use client";
import { useEffect, useState, useCallback } from "react";

const STEPS = ["welcome", "connect", "compose", "explore", "done"];

export default function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/status");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const body = await res.json();
      setStatus(body);
    } catch {
      // non-fatal — the wizard still works without live status
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Refresh status whenever the user comes back to this tab (e.g. after
  // connecting an account or scheduling a post in another tab/step).
  useEffect(() => {
    function onFocus() {
      loadStatus();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadStatus]);

  async function finish() {
    setFinishing(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } finally {
      window.location.href = "/dashboard";
    }
  }

  const step = STEPS[stepIndex];
  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  return (
    <div>
      <h1>Welcome</h1>
      <p className="subtitle">A quick tour — takes about a minute, and you can skip anything.</p>

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= stepIndex ? "var(--accent)" : "var(--line)",
            }}
          />
        ))}
      </div>

      {step === "welcome" && (
        <div className="card">
          <strong>Write once. Post everywhere, in your own voice.</strong>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
            Community Scheduler lets you write a post once, let AI adapt the tone for each community, and schedule
            it to your own connected accounts — Reddit, Discord, Mastodon, Telegram, Bluesky, X, Facebook, and
            Lemmy. Nothing posts without you explicitly scheduling it, and everything runs through your own
            accounts, never a shared bot.
          </p>
          <button type="button" onClick={goNext}>
            Let's go
          </button>
        </div>
      )}

      {step === "connect" && (
        <div className="card">
          <strong>Step 1: Connect an account</strong>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
            Everything starts with connecting somewhere to post to. Discord is the fastest to set up — just paste
            a webhook URL, no approval needed.
          </p>
          {status?.hasConnection && <p className="success">✓ You've connected an account.</p>}
          <a href="/connect" target="_blank" rel="noreferrer">
            <button type="button">Open Connections</button>
          </a>
          <button type="button" className="secondary" onClick={goNext}>
            {status?.hasConnection ? "Continue" : "I'll do this later"}
          </button>
        </div>
      )}

      {step === "compose" && (
        <div className="card">
          <strong>Step 2: Write and schedule a post</strong>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
            Head to Compose, write what you want to say, and click "AI-adapt" — it'll rewrite it to fit the tone of
            wherever you're posting, and flag anything that reads too much like a sales pitch before you schedule it.
          </p>
          {status?.hasScheduled && <p className="success">✓ You've scheduled a post.</p>}
          <a href="/compose" target="_blank" rel="noreferrer">
            <button type="button">Open Compose</button>
          </a>
          <button type="button" className="secondary" onClick={goNext}>
            {status?.hasScheduled ? "Continue" : "I'll do this later"}
          </button>
        </div>
      )}

      {step === "explore" && (
        <div className="card">
          <strong>What else is here</strong>
          <div style={{ marginTop: 12 }}>
            <FeatureRow title="Campaigns" desc="Adapt one post for many communities and schedule them all at once." />
            <FeatureRow title="Calendar" desc="See everything scheduled on a month view — drag a post to a new day to reschedule it." />
            <FeatureRow title="Analytics" desc="Track how posts perform once they're live, where the platform supports it." />
            <FeatureRow title="Best Times" desc="Suggested posting windows, personalized once you've got enough history." />
            <FeatureRow title="Team" desc="Invite collaborators to work in your workspace (Pro)." />
          </div>
          <button type="button" onClick={goNext}>
            Got it
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="card">
          <strong>You're set up.</strong>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
            Head to your dashboard — if you skipped anything, you'll see reminders there.
          </p>
          <button type="button" onClick={finish} disabled={finishing}>
            {finishing ? "..." : "Go to dashboard"}
          </button>
        </div>
      )}

      {step !== "welcome" && step !== "done" && (
        <button type="button" className="secondary" onClick={goBack}>
          Back
        </button>
      )}
    </div>
  );
}

function FeatureRow({ title, desc }) {
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <strong style={{ fontSize: 14 }}>{title}</strong>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>{desc}</p>
    </div>
  );
}
