// lib/discordBot.js
// An alternative to webhook-based Discord connections. Instead of a
// user pasting a per-channel webhook URL, this app has its own single
// Discord bot application. A server admin invites that bot to their
// server (standard Discord OAuth2 bot-invite flow — explicit consent,
// same as any Discord bot install), then the user picks which channel
// the bot should post to from a dropdown.
//
// This still requires the server's admin to say yes — Discord has no
// mechanism for a third-party app to post into a server without that.
// What it removes is needing a webhook URL per channel; one bot invite
// covers every channel in that server the bot has access to.
//
// Setup (see .env.example): create an application at
// https://discord.com/developers/applications, add a Bot, copy its
// token into DISCORD_BOT_TOKEN, and the application's Client ID into
// DISCORD_CLIENT_ID.

function getBotInviteUrl(state, redirectUri) {
  const permissions = "2048"; // Send Messages
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    scope: "bot",
    permissions,
    state,
    redirect_uri: redirectUri,
    response_type: "code",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// Text channels in a guild the bot has been added to. Requires the bot
// to actually be a member of that guild already (i.e. after invite).
async function listGuildTextChannels(guildId) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Couldn't list channels for that server: ${await res.text()}`);
  }
  const channels = await res.json();
  // type 0 = GUILD_TEXT, the only kind we can post plain messages into
  return channels
    .filter((c) => c.type === 0)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ id: c.id, name: c.name }));
}

async function getGuildName(guildId) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) return null;
  const guild = await res.json();
  return guild.name || null;
}

async function postMessageAsBot(channelId, content) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error(`Discord bot post failed (${res.status}): ${await res.text()}`);
  }
  return res.json(); // includes the message id
}

module.exports = { getBotInviteUrl, listGuildTextChannels, getGuildName, postMessageAsBot };
