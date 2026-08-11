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
          in plain text). Content you write and schedule to post. OAuth
          access/refresh tokens for platforms you connect (Reddit), and
          webhook URLs for platforms you connect (Discord) — these let us
          post on your behalf only when you schedule a post. Billing
          information is handled entirely by Stripe; we store only your
          Stripe customer ID, not your card details.
        </p>

        <h3>What we don't do</h3>
        <p>
          We don't sell your data. We don't post anything to any platform
          without you explicitly scheduling it. We don't read your private
          messages or DMs on connected platforms — this service only has
          permission to submit posts, not read your account activity beyond
          what's needed to authenticate.
        </p>

        <h3>Third parties we use</h3>
        <p>
          Stripe (payments), Anthropic (AI post-drafting — your draft
          content is sent to Anthropic's API to generate adapted versions),
          Reddit and Discord APIs (to post on your behalf), and [your email
          provider, e.g. Resend] (transactional emails like password
          resets).
        </p>

        <h3>Data retention</h3>
        <p>
          We retain your account data until you delete your account.
          [Add specifics on how account deletion works once you build it —
          not yet implemented in this scaffold.]
        </p>

        <h3>Your rights</h3>
        <p>
          You can request a copy of your data or request deletion by
          contacting [your support email]. [If you have EU/UK users, this
          section needs to reference GDPR rights specifically — Article 15
          (access), Article 17 (erasure), etc. Get real legal review.]
        </p>

        <h3>Changes to this policy</h3>
        <p>
          We may update this policy from time to time. Material changes
          will be noted here.
        </p>

        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 24 }}>
          Last updated: [date] — Contact: [your support email]
        </p>
      </div>
    </div>
  );
}
