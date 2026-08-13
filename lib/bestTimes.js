// lib/bestTimes.js
// Suggests good posting windows per platform. Prefers the user's own
// engagement history (see lib/engagement.js / the analytics feature) once
// there's enough of it to mean something; falls back to general posting-
// pattern heuristics otherwise so new users still get useful guidance.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// 3-hour blocks, indexed 0-7 (0 = 12am-3am ... 7 = 9pm-12am)
function hourBlockLabel(block) {
  const startHour = block * 3;
  const endHour = (startHour + 3) % 24;
  const fmt = (h) => {
    const period = h < 12 ? "am" : "pm";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${period}`;
  };
  return `${fmt(startHour)}–${fmt(endHour)}`;
}

// Minimum posts-with-engagement-data before we trust a personal pattern
// over generic advice — below this, day/hour buckets are too noisy.
const MIN_SAMPLES_FOR_PERSONAL = 4;

// `rows` = posted scheduled_posts for one platform with a non-null
// engagement_score, each needs { scheduled_for, engagement_score }.
function computePersonalBestTimes(rows) {
  if (rows.length < MIN_SAMPLES_FOR_PERSONAL) return null;

  const buckets = new Map(); // "day-block" -> { day, block, total, count }
  for (const r of rows) {
    const d = new Date(r.scheduled_for);
    const day = d.getDay();
    const block = Math.floor(d.getHours() / 3);
    const key = `${day}-${block}`;
    if (!buckets.has(key)) buckets.set(key, { day, block, total: 0, count: 0 });
    const b = buckets.get(key);
    b.total += r.engagement_score || 0;
    b.count += 1;
  }

  const ranked = [...buckets.values()]
    .map((b) => ({ ...b, avgScore: b.total / b.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3);

  if (ranked.length === 0) return null;

  return ranked.map((b) => ({
    label: `${DAY_NAMES[b.day]}s, ${hourBlockLabel(b.block)}`,
    avgScore: Math.round(b.avgScore * 10) / 10,
    sampleCount: b.count,
  }));
}

// Generic heuristics, written from general well-known posting-pattern
// guidance — not a substitute for testing what actually works for your
// specific audience, but a reasonable starting point before you have data.
const GENERIC_BEST_TIMES = {
  reddit: {
    label: "Weekday mornings (7–9am) and lunchtime (12–1pm), audience-local time",
    note: "Catches people scrolling before work and during a lunch break. Avoid late Friday evening through Saturday for most non-meme subreddits.",
  },
  lemmy: {
    label: "Weekday mornings (7–9am) and lunchtime (12–1pm), audience-local time",
    note: "Lemmy's audience skews similar to Reddit's — same browsing habits, same quiet weekends.",
  },
  discord: {
    label: "Evenings (7–10pm), any day",
    note: "Most servers are more active after work/school hours, and weekends can be busier than weekdays depending on the community.",
  },
  mastodon: {
    label: "Weekday mid-morning to early afternoon (9am–1pm)",
    note: "Similar rhythm to X/Twitter — steady scrolling during the workday, less on weekends.",
  },
  telegram: {
    label: "Evenings (6–9pm)",
    note: "Channels tend to get read in a batch when people check messages after their day winds down.",
  },
  bluesky: {
    label: "Weekday mornings (8–11am)",
    note: "An audience that tends to check in early, similar to early Twitter usage patterns.",
  },
  twitter: {
    label: "Weekday mid-morning (9–11am) and early afternoon (1–3pm)",
    note: "Two natural check-in windows around the start and after-lunch stretch of the workday.",
  },
  facebook: {
    label: "Weekday early afternoon (1–4pm)",
    note: "Page engagement tends to peak once people have settled into their day.",
  },
  tiktok: {
    label: "Evenings (7–10pm), especially weekends",
    note: "Short-form video consumption skews toward leisure hours — after work/school and weekend downtime tend to see the most scrolling.",
  },
};

function getGenericBestTime(platform) {
  return GENERIC_BEST_TIMES[platform] || {
    label: "No general guidance available yet for this platform",
    note: "Post a few times and check back — once you have engagement data we can personalize this.",
  };
}

module.exports = { computePersonalBestTimes, getGenericBestTime, MIN_SAMPLES_FOR_PERSONAL };
