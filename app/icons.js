// app/icons.js
// A custom, abstract icon per platform — each evokes the platform through
// a shape or concept (upvoting, federation, broadcast, flight) rather than
// reproducing anyone's trademarked logo. Monoline, currentColor, 24x24.

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconReddit(props) {
  // upvote chevron in a circle — community voting, not the snoo mascot
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14 L12 10 L15.5 14" />
    </svg>
  );
}

export function IconX(props) {
  // ascending signal bars — broadcast strength, not the wordmark
  return (
    <svg {...base} {...props}>
      <line x1="7" y1="16" x2="7" y2="12" />
      <line x1="12" y1="16" x2="12" y2="8" />
      <line x1="17" y1="16" x2="17" y2="5" />
    </svg>
  );
}

export function IconDiscord(props) {
  // speech bubble with a small waveform inside — voice + text community
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5A2 2 0 0 1 6 4.5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3v-3H6a2 2 0 0 1-2-2z" />
      <line x1="8.5" y1="9.5" x2="8.5" y2="11.5" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="15.5" y1="9.5" x2="15.5" y2="11.5" />
    </svg>
  );
}

export function IconMastodon(props) {
  // orbiting node — federation
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="12" r="5.5" />
      <ellipse cx="11" cy="12" rx="9" ry="4" transform="rotate(-25 11 12)" strokeDasharray="2.2 3" />
      <circle cx="18.5" cy="7" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTelegram(props) {
  // simplified paper plane, no enclosing circle
  return (
    <svg {...base} {...props}>
      <path d="M3.5 12.5 L20 4.5 L14 20 L11 13.5 Z" />
      <path d="M11 13.5 L20 4.5" />
    </svg>
  );
}

export function IconBluesky(props) {
  // simple wing/flight arcs — abstracted bird, not the actual mark
  return (
    <svg {...base} {...props}>
      <path d="M4 7c4 0 7 3.5 8 7 1-3.5 4-7 8-7-0.5 4-3 8-8 9-5-1-7.5-5-8-9z" />
    </svg>
  );
}

export function IconFacebook(props) {
  // page with a folded corner — generic "page" concept
  return (
    <svg {...base} {...props}>
      <path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M15 4v4h4" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
      <line x1="8.5" y1="15.5" x2="13" y2="15.5" />
    </svg>
  );
}

export function IconLemmy(props) {
  // hex network node — federation, differentiated from Mastodon's orbit
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 L19 7.75 V16.25 L12 20.5 L5 16.25 V7.75 Z" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <line x1="12" y1="12" x2="12" y2="7" />
      <line x1="12" y1="12" x2="16.5" y2="14.5" />
      <line x1="12" y1="12" x2="7.5" y2="14.5" />
    </svg>
  );
}

export function IconTikTok(props) {
  // a musical note with a small orbiting arc — short-form video/sound,
  // not the actual TikTok mark
  return (
    <svg {...base} {...props}>
      <path d="M13 5 V15.5 a3 3 0 1 1 -2.2 -2.9" />
      <path d="M13 5 a4.5 4.5 0 0 0 4.5 4.5" strokeDasharray="1.5 2.5" />
    </svg>
  );
}

export const PLATFORM_ICONS = {
  reddit: IconReddit,
  twitter: IconX,
  discord: IconDiscord,
  mastodon: IconMastodon,
  telegram: IconTelegram,
  bluesky: IconBluesky,
  facebook: IconFacebook,
  lemmy: IconLemmy,
  tiktok: IconTikTok,
};

// A small circular badge wrapping any platform icon — the consistent
// presentation used on the Connect page and the landing page constellation.
export function PlatformBadge({ platform, size = 40 }) {
  const Icon = PLATFORM_ICONS[platform];
  if (!Icon) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--panel-2)",
        border: "1px solid var(--line)",
        color: "var(--teal)",
        flexShrink: 0,
      }}
    >
      <Icon width={size * 0.5} height={size * 0.5} />
    </span>
  );
}
