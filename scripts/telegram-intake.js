// telegram-intake.js - Polls Telegram getUpdates and verifies monitors via /start <sessionToken>

const fs = require("fs");
const path = require("path");

const MONITORS_PATH = path.join(__dirname, "../monitors.json");
const STATE_PATH = path.join(__dirname, "../state.json");

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function sendHi(token, chatId) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: String(chatId),
      text: "hi"
    })
  });
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    process.exit(1);
  }

  const monitors = loadJson(MONITORS_PATH, []);
  const state = loadJson(STATE_PATH, {});
  const lastOffset = Number(state.telegramLastUpdateId || 0);

  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastOffset + 1}&timeout=0`);
  if (!res.ok) {
    throw new Error(`Telegram getUpdates failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.ok || !Array.isArray(data.result)) {
    throw new Error("Telegram returned invalid updates payload");
  }

  let maxUpdateId = lastOffset;
  let changed = false;

  for (const update of data.result) {
    if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;

    const msg = update.message;
    if (!msg || typeof msg.text !== "string") continue;

    const startMatch = msg.text.match(/^\/start\s+([a-zA-Z0-9_-]+)$/);
    if (!startMatch) continue;

    const sessionToken = startMatch[1];
    const chatId = msg.chat && msg.chat.id;
    if (!chatId) continue;

    const monitor = monitors.find((m) => m.sessionToken === sessionToken && m.active !== false);
    if (!monitor) continue;

    let channel = (monitor.channels || []).find((c) => c.platform === "telegram");
    if (!channel) {
      channel = { platform: "telegram", verified: false };
      monitor.channels = monitor.channels || [];
      monitor.channels.push(channel);
    }

    channel.chatId = String(chatId);
    channel.verified = true;
    channel.verifiedAt = new Date().toISOString();

    monitor.verified = (monitor.channels || []).every((c) => c.verified);
    monitor.updatedAt = new Date().toISOString();

    await sendHi(token, chatId);
    console.log(`Verified Telegram chat for monitor ${monitor.id}`);
    changed = true;
  }

  state.telegramLastUpdateId = maxUpdateId;

  if (changed) saveJson(MONITORS_PATH, monitors);
  saveJson(STATE_PATH, state);

  console.log(`Processed ${data.result.length} update(s)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
