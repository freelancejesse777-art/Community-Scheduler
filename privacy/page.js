export default function PrivacyPage() {
  return (
    <div>
      <h1>Privacy Policy</h1>
      <p className="subtitle">
        This is a starting template, not legal advice — have a lawyer review
        it before you rely on it, especially if you'll have users in the EU
        (GDPR), California (CCPA), or other regulated jurisdictions.
      </p>

      <div className="card">
        <h3>What we collect</h3>
        <p>
          Your email address and password (stored as a one-way hash, never
          in plain text). Content you write and schedule to post.
          Credentials for platforms you connect — OAuth access/refresh
          tokens (Reddit, X), webhook URLs (Discord), or access
          tokens/passwords you provide directly (Mastodon, Telegram,
          Bluesky, Facebook, Lemmy) — these let us post on your behalf only
          when you schedule a post. Billing information is handled entirely
          by Stripe; we store only your Stripe customer ID, not your card
          details. If you submit feedback, we store the message and,
          optionally, an email to follow up.
        </p>

        <h3>What we don't do</h3>
        <p>
          We don't sell your data. We don't post anything to any platform
          without you explicitly scheduling it. We don't read your private
          messages or DMs on connected platforms — this service only has
          permission to submit posts, not read your account activity beyond
          what's needed to authenticate.
        </p>

        <h3>Team workspaces</h3>
        <p>
          If you're invited to someone else's workspace, you can see and
          act on their connections, posts, and scheduled content — that
          data belongs to the workspace owner, not to you individually. If
          you own a workspace and invite others, they get the same access.
        </p>

        <h3>Third parties we use</h3>
        <p>
          Stripe (payments), Anthropic (AI post-drafting — your draft
          content is sent to Anthropic's API to generate adapted versions),
          the platform APIs you connect (Reddit, Discord, Mastodon,
          Telegram, Bluesky, X, Facebook, Lemmy — to post on your behalf),
          and an email provider for transactional emails like password
          resets and team invites. If error monitoring is enabled, error
          details (which may include parts of your request) are sent to
          our error-tracking provider to help us fix bugs.
        </p>

        <h3>Data retention and deletion</h3>
        <p>
          We retain your account data until you delete your account. You
          can permanently delete your account and all associated
          data — connections, posts, scheduled posts — at any time from the
          Account page. Workspace owners need to remove any teammates
          first. You can also download a copy of your data from the same
          page before deleting it.
        </p>

        <h3>Your rights</h3>
        <p>
          You can export or delete your data yourself at any time from the
          Account page, or reach us via the <a href="/feedback">feedback form</a>.
          [If you have EU/UK users, this section needs to reference GDPR
          rights specifically — Article 15 (access), Article 17 (erasure),
          etc. Get real legal review.]
        </p>

        <h3>Changes to this policy</h3>
        <p>
          We may update this policy from time to time. Material changes
          will be noted here.
        </p>

        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 24 }}>
          Last updated: [date] — Contact: <a href="/feedback">send feedback</a>, or add a support email here.
        </p>
      </div>
    </div>
  );
}
