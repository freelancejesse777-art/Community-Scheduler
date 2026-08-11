// lib/discord.js
// Discord posting via incoming webhooks. This is deliberately simpler than
// a full bot integration: the user creates a webhook in a server channel
// they already have permission to post in (Channel Settings > Integrations
// > Webhooks > New Webhook), and pastes the URL here. No bot approval,
// no OAuth scopes, no "add bot to server" friction.

async function postToDiscordWebhook(webhookUrl, content) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Discord webhook failed (${res.status}): ${await res.text()}`);
  }
  return true;
}

module.exports = { postToDiscordWebhook };
