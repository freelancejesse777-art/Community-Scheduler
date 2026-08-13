"use client";
import { useState } from "react";

export default function AccountPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState(null);

  async function exportData() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Couldn't export your data.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "community-scheduler-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't delete your account.");
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1>Account</h1>
      <p className="subtitle">Your data, and your options for it.</p>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <strong>Export your data</strong>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          Downloads a JSON file with your account info, posts, scheduled posts, and connection labels. Access
          tokens and credentials aren't included.
        </p>
        <button type="button" className="secondary" onClick={exportData} disabled={exporting}>
          {exporting ? "Preparing..." : "Download my data"}
        </button>
      </div>

      <div className="card">
        <strong>Delete your account</strong>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          Permanently deletes your account, connections, posts, and scheduled posts. This can't be undone. If
          you're a workspace owner with active teammates, remove them from the{" "}
          <a href="/team">Team page</a> first.
        </p>
        <label>Type DELETE to confirm</label>
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
        <button
          type="button"
          style={{ background: "var(--coral)" }}
          onClick={deleteAccount}
          disabled={deleting || confirmText !== "DELETE"}
        >
          {deleting ? "Deleting..." : "Delete my account"}
        </button>
      </div>
    </div>
  );
}
