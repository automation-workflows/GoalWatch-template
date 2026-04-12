// notify.js — supports Discord, Telegram, Slack, Email (via webhook)

async function sendNotification(platform, config, message) {
  const { title, body, goalMet } = message;
  const emoji = goalMet ? "✅" : "⏳";

  try {
    switch (platform) {
      case "discord":
        await sendDiscord(config.webhook, emoji, title, body);
        break;
      case "telegram":
        await sendTelegram(config.botToken, config.chatId, emoji, title, body);
        break;
      case "slack":
        await sendSlack(config.webhook, emoji, title, body);
        break;
      case "custom_webhook":
        await sendCustomWebhook(config.webhook, { title, body, goalMet, emoji });
        break;
      default:
        console.error(`Unknown platform: ${platform}`);
    }
    console.log(`  ✓ Sent ${platform} notification`);
  } catch (err) {
    console.error(`  ✗ Failed to send ${platform} notification:`, err.message);
  }
}

async function sendDiscord(webhookUrl, emoji, title, body) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: `${emoji} ${title}`,
        description: body,
        color: emoji === "✅" ? 0x00ff99 : 0xffa500,
        footer: { text: "GoalWatch • Powered by GitHub Actions" },
        timestamp: new Date().toISOString(),
      }]
    })
  });
}

async function sendTelegram(botToken, chatId, emoji, title, body) {
  const text = `${emoji} *${escapeMarkdown(title)}*\n\n${escapeMarkdown(body)}`;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2"
    })
  });
}

async function sendSlack(webhookUrl, emoji, title, body) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `${emoji} ${title}` }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: body }
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "GoalWatch • Powered by GitHub Actions" }]
        }
      ]
    })
  });
}

async function sendCustomWebhook(webhookUrl, payload) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
      source: "goalwatch"
    })
  });
}

// Send a plain test notification (for verification step)
async function sendTestNotification(platform, config) {
  const testMessage = {
    title: "GoalWatch Test Notification",
    body: "🎉 Your notification channel is working! Click **Verify** on the setup page to activate your monitor.",
    goalMet: true
  };
  await sendNotification(platform, config, testMessage);
}

function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

module.exports = { sendNotification, sendTestNotification };
