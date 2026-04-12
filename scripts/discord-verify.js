// discord-verify.js - Opens DM and sends hi to user, then stores Discord channelId

const fs = require("fs");
const path = require("path");

const MONITORS_PATH = path.join(__dirname, "../monitors.json");

function loadMonitors() {
  try {
    if (!fs.existsSync(MONITORS_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(MONITORS_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMonitors(monitors) {
  fs.writeFileSync(MONITORS_PATH, JSON.stringify(monitors, null, 2));
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const userId = process.env.DISCORD_USER_ID;
  const monitorId = process.env.MONITOR_ID;

  if (!token || !userId || !monitorId) {
    throw new Error("Missing env vars: DISCORD_BOT_TOKEN, DISCORD_USER_ID, MONITOR_ID");
  }

  const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ recipient_id: String(userId) })
  });

  if (!dmRes.ok) {
    const details = await dmRes.text();
    throw new Error(`Create DM failed: ${dmRes.status} ${details}`);
  }

  const dm = await dmRes.json();
  const channelId = dm.id;

  const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content: "hi" })
  });

  if (!msgRes.ok) {
    const details = await msgRes.text();
    throw new Error(`Send DM failed: ${msgRes.status} ${details}`);
  }

  const monitors = loadMonitors();
  const monitor = monitors.find((m) => m.id === monitorId);
  if (!monitor) {
    throw new Error(`Monitor not found: ${monitorId}`);
  }

  monitor.channels = monitor.channels || [];
  let channel = monitor.channels.find((c) => c.platform === "discord");
  if (!channel) {
    channel = { platform: "discord", verified: false };
    monitor.channels.push(channel);
  }

  channel.userId = String(userId);
  channel.channelId = String(channelId);
  channel.verified = true;
  channel.verifiedAt = new Date().toISOString();
  channel.testSentAt = new Date().toISOString();
  monitor.verified = (monitor.channels || []).every((c) => c.verified);
  monitor.lastVerifiedPlatform = "discord";
  monitor.verifiedAt = new Date().toISOString();
  monitor.updatedAt = new Date().toISOString();

  saveMonitors(monitors);
  console.log(`Discord test sent for monitor ${monitorId}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
