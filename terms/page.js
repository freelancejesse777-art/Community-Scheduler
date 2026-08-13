export default function TermsPage() {
  return (
    <div>
      <h1>Terms of Service</h1>
      <p className="subtitle">
        This is a starting template, not legal advice — have a lawyer review
        it before you rely on it for a real business.
      </p>

      <div className="card">
        <h3>1. What this service does</h3>
        <p>
          Community Scheduler lets you connect your own accounts on Reddit,
          Discord, Mastodon, Telegram, Bluesky, X, Facebook, and Lemmy, and
          schedule content you write to be posted on your behalf, at a time
          you choose. AI is used to adapt your content's tone per
          destination before you review and approve it.
        </p>

        <h3>2. Your responsibility for platform rules</h3>
        <p>
          You are solely responsible for complying with the rules of every
          platform and community you post to, including subreddit-specific
          self-promotion rules and each platform's own terms of service.
          This service provides a basic automated check for some common
          self-promotional language, but that check is not exhaustive and
          does not guarantee compliance with any community's rules. We are
          not responsible for account bans, content removal, or other
          consequences resulting from your posts.
        </p>

        <h3>3. Acceptable use</h3>
        <p>
          You agree not to use this service to post spam, to post to
          communities you are not a genuine member of for the purpose of
          promotion, to circumvent platform bans or restrictions, or to
          violate any applicable law.
        </p>

        <h3>4. Team workspaces</h3>
        <p>
          If you invite collaborators to your workspace, they can act on
          your connected accounts and scheduled content on your behalf.
          You're responsible for who you invite and what they post using
          your connections.
        </p>

        <h3>5. Account and billing</h3>
        <p>
          Paid subscriptions are billed monthly via Stripe. You can cancel
          at any time from the billing page; cancellation takes effect at
          the end of the current billing period. [Add your refund policy
          here.]
        </p>

        <h3>6. Termination and account deletion</h3>
        <p>
          We may suspend or terminate accounts that violate these terms or
          that we reasonably believe are being used for spam or abuse. You
          can delete your own account and all associated data at any time
          from the Account page.
        </p>

        <h3>7. Disclaimer of warranties / limitation of liability</h3>
        <p>
          This service is provided "as is" without warranties of any kind.
          [This section needs real legal drafting for your jurisdiction
          before you rely on it.]
        </p>

        <h3>8. Changes to these terms</h3>
        <p>
          We may update these terms from time to time. Continued use of the
          service after changes constitutes acceptance of the new terms.
        </p>

        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 24 }}>
          Last updated: [date] — Contact: <a href="/feedback">send feedback</a>, or add a support email here.
        </p>
      </div>
    </div>
  );
}
