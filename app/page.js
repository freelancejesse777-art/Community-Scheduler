export default function Home() {
  return (
    <div>
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
          <li>Connect your Reddit account and any Discord channels you have webhook access to</li>
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
