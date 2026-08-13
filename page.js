import { PLATFORM_ICONS } from "./icons";

const CONSTELLATION_PLATFORMS = [
  "reddit", "discord", "mastodon", "telegram", "bluesky", "twitter", "facebook", "lemmy",
];

export default function Home() {
  return (
    <div>
      <ConstellationHero />

      <h1>Post to communities you're already part of — without the copy-paste.</h1>
      <p className="subtitle">
        Write your update once. Get an AI-adapted version for each
        subreddit or Discord server's tone. Schedule it. No spam, no bots
        posting where you've never been — everything runs through your own
        accounts.
      </p>

      <div className="card">
        <strong>How it works</strong>
        <ol style={{ paddingLeft: 20, color: "var(--ink)" }}>
          <li>Connect the platforms you're already a real member of</li>
          <li>Write your post once</li>
          <li>AI adapts the tone and format for each destination — casual for one server, detailed for a subreddit that wants context</li>
          <li>Review a built-in self-promo risk check before anything goes out</li>
          <li>Schedule it, or post now</li>
        </ol>
      </div>

      <div className="card">
        <strong>Free</strong>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          1 connection, 5 scheduled posts a month. No credit card required.
        </p>
      </div>

      <div className="card">
        <strong>Pro — for people posting across multiple communities regularly</strong>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Unlimited connections and scheduled posts, AI drafting included.
        </p>
      </div>

      <a href="/login"><button>Get started free</button></a>
    </div>
  );
}

// The hero: one signal, radiating out to every platform it can reach —
// the actual thing this product does, made visual. Nodes are positioned
// on a semicircle above a central hub; each connecting line "fires" on a
// staggered loop rather than all at once, so it reads as a broadcast
// pulsing outward rather than a static diagram.
function ConstellationHero() {
  const radius = 150;
  const centerX = 200;
  const centerY = 195;

  const nodes = CONSTELLATION_PLATFORMS.map((platform, i) => {
    const count = CONSTELLATION_PLATFORMS.length;
    // spread across a 200° arc above the hub
    const angle = Math.PI + (Math.PI * 0.11) + (i / (count - 1)) * (Math.PI * 0.78);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle) * 0.82;
    return { platform, x, y, delay: i * 0.35 };
  });

  return (
    <div className="constellation" aria-hidden="true">
      <svg viewBox="0 0 400 210" preserveAspectRatio="xMidYMax meet">
        {nodes.map((n) => (
          <line
            key={`line-${n.platform}`}
            className="constellation-line"
            x1={centerX}
            y1={centerY}
            x2={n.x}
            y2={n.y}
            style={{ animationDelay: `${n.delay}s` }}
          />
        ))}
        <circle className="constellation-hub" cx={centerX} cy={centerY} r="7" />
        <circle className="constellation-hub-ring" cx={centerX} cy={centerY} r="7" />
      </svg>
      <div className="constellation-nodes">
        {nodes.map((n) => {
          const Icon = PLATFORM_ICONS[n.platform];
          return (
            <span
              key={n.platform}
              className="constellation-node"
              style={{
                left: `${(n.x / 400) * 100}%`,
                top: `${(n.y / 210) * 100}%`,
                animationDelay: `${n.delay}s`,
              }}
            >
              {Icon && <Icon width={16} height={16} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
