"use client";
import { useEffect, useState, useMemo, useCallback } from "react";

const PLATFORM_LABELS = {
  reddit: "Reddit",
  discord: "Discord",
  mastodon: "Mastodon",
  telegram: "Telegram",
  bluesky: "Bluesky",
  twitter: "X",
  facebook: "Facebook",
  lemmy: "Lemmy",
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time
function toDatetimeLocalValue(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// Builds a full 6-row grid (42 days) covering the given month, including
// the trailing/leading days from adjacent months so every week is complete.
function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarPage() {
  const [scheduled, setScheduled] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [dragOverKey, setDragOverKey] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/schedule");
      const body = await res.json();
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(body.error || "Couldn't load your schedule.");
      setScheduled(body.scheduled || []);
    } catch (err) {
      setLoadError(err.message === "Failed to fetch" ? "Couldn't reach the server." : err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const postsByDay = useMemo(() => {
    const map = new Map();
    for (const s of scheduled) {
      const key = dateKey(new Date(s.scheduled_for));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));
    }
    return map;
  }, [scheduled]);

  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const today = new Date();
  const todayKey = dateKey(today);

  function goToMonth(offset) {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + offset, 1));
  }

  async function reschedule(id, newIsoOrLocalValue) {
    setMessage(null);
    try {
      const res = await fetch(`/api/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: new Date(newIsoOrLocalValue).toISOString() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't reschedule.");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    }
  }

  async function cancelPost(id) {
    if (!window.confirm("Cancel this scheduled post? This can't be undone.")) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't cancel.");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    }
  }

  function onDragStart(e, post) {
    if (post.status !== "pending") return;
    e.dataTransfer.setData("text/plain", String(post.id));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropOnDay(e, day) {
    e.preventDefault();
    setDragOverKey(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const post = scheduled.find((s) => String(s.id) === id);
    if (!post) return;

    // Keep the original time-of-day, just move the date
    const original = new Date(post.scheduled_for);
    const moved = new Date(day);
    moved.setHours(original.getHours(), original.getMinutes(), 0, 0);
    reschedule(post.id, moved);
  }

  function startEditing(post) {
    setEditingId(post.id);
    setEditValue(toDatetimeLocalValue(new Date(post.scheduled_for)));
  }

  async function saveEditing() {
    await reschedule(editingId, editValue);
    setEditingId(null);
  }

  if (loadError) {
    return (
      <div>
        <h1>Calendar</h1>
        <p className="error">{loadError}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Calendar</h1>
      <p className="subtitle">Drag a pending post to a new day to reschedule it, or use the reschedule button on mobile.</p>

      {message && <p className="error">{message.text}</p>}

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button type="button" className="secondary" style={{ marginTop: 0 }} onClick={() => goToMonth(-1)}>
            ← Prev
          </button>
          <strong>{monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button type="button" className="secondary" style={{ marginTop: 0 }} onClick={() => goToMonth(1)}>
            Next →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} style={{ textAlign: "center", padding: "4px 0" }}>
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {days.map((day) => {
            const key = dateKey(day);
            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
            const isToday = key === todayKey;
            const posts = postsByDay.get(key) || [];
            const isDragOver = dragOverKey === key;

            return (
              <div
                key={key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverKey(key);
                }}
                onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                onDrop={(e) => onDropOnDay(e, day)}
                style={{
                  minHeight: 88,
                  border: `1px solid ${isDragOver ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 6,
                  padding: 4,
                  background: isToday ? "#fdf3e7" : isCurrentMonth ? "white" : "#faf8f4",
                  opacity: isCurrentMonth ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{day.getDate()}</div>
                {posts.map((post) => (
                  <div
                    key={post.id}
                    draggable={post.status === "pending"}
                    onDragStart={(e) => onDragStart(e, post)}
                    onClick={() => post.status === "pending" && startEditing(post)}
                    title={`${post.destination} · ${post.status}${post.result_message ? " · " + post.result_message : ""}`}
                    style={{
                      fontSize: 10,
                      padding: "3px 5px",
                      borderRadius: 4,
                      marginBottom: 3,
                      cursor: post.status === "pending" ? "grab" : "default",
                      background:
                        post.status === "posted" ? "#e2f0e6" : post.status === "failed" ? "#f5e3e0" : "#eee",
                      color:
                        post.status === "posted" ? "var(--success)" : post.status === "failed" ? "var(--danger)" : "var(--ink)",
                    }}
                  >
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {PLATFORM_LABELS[post.platform] || post.platform}
                    </div>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {post.destination}
                    </div>
                    <div>{new Date(post.scheduled_for).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {editingId && (
        <div className="card">
          <strong>Reschedule post</strong>
          <label>New date & time</label>
          <input type="datetime-local" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          <button type="button" onClick={saveEditing}>
            Save
          </button>
          <button type="button" className="secondary" onClick={() => setEditingId(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="secondary"
            style={{ color: "var(--danger)" }}
            onClick={() => {
              cancelPost(editingId);
              setEditingId(null);
            }}
          >
            Delete this post
          </button>
        </div>
      )}
    </div>
  );
}
