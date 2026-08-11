// lib/email.js
// Minimal pluggable email sender. Uses Resend if RESEND_API_KEY is set;
// otherwise logs the email to the console so local dev/testing still works
// without needing a real email provider configured.

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    console.log("\n--- EMAIL (no RESEND_API_KEY set, logging instead) ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("--- END EMAIL ---\n");
    return { simulated: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddress, to, subject, text }),
  });

  if (!res.ok) {
    throw new Error(`Email send failed: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { sendEmail };
