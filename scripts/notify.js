// notify.js - Telegram + Discord senders for GoalWatch

function buildNotificationText(message) {
  const emoji = message.goalMet ? "✅" : "⏳";
  return [
    `${emoji} ${message.goalMet ? "Goal Met!" : "Not yet"}`,
    `Goal: ${message.goal}`,
    `Status: ${message.reason}`,
    `Site: ${message.site}`,
    `Checked: ${message.checkedAtIst}`
  ].join("\n");
}

async function sendTelegramNotification(chatId, message, token = process.env.TELEGRAM_BOT_TOKEN) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  if (!chatId) throw new Error("Telegram chatId is missing");

  const text = buildNotificationText(message);
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: String(chatId),
      text
    })
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${details}`);
  }
}

async function sendDiscordNotification(channelId, message, token = process.env.DISCORD_BOT_TOKEN) {
  if (!token) throw new Error("DISCORD_BOT_TOKEN is missing");
  if (!channelId) throw new Error("Discord channelId is missing");

  const content = buildNotificationText(message);
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content })
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Discord send failed: ${res.status} ${details}`);
  }
}

async function sendPlatformNotification(channel, message) {
  if (channel.platform === "telegram") {
    await sendTelegramNotification(channel.chatId, message);
    return;
  }
  if (channel.platform === "discord") {
    await sendDiscordNotification(channel.channelId, message);
    return;
  }
  throw new Error(`Unsupported platform: ${channel.platform}`);
}

module.exports = {
  sendTelegramNotification,
  sendDiscordNotification,
  sendPlatformNotification,
  buildNotificationText
};
