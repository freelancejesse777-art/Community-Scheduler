// lib/telegram.js
// Telegram posting via a bot the user creates themselves through @BotFather
// (a few messages in Telegram, no approval process), then adds as an admin
// to their own channel or group. The bot token + target chat ID are stored
// per-connection.

async function postToTelegram(botToken, chatId, content) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: content }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram post failed: ${data.description || "unknown error"}`);
  }
  return data;
}

async function verifyTelegramBot(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) return null;
    return data.result; // includes .username
  } catch {
    return null; // network error, invalid token format, or non-JSON response
  }
}

module.exports = { postToTelegram, verifyTelegramBot };
