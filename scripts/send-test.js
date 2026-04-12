// send-test.js - sends a test notification for a specific monitor/channel
// Env:
//   MONITOR_ID: monitor id
//   PLATFORM: optional platform override (discord|telegram|slack|custom_webhook)

const fs = require("fs");
const path = require("path");
const { sendTestNotification } = require("./notify.js");

const MONITORS_PATH = path.join(__dirname, "../monitors.json");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const monitorId = process.env.MONITOR_ID;
  const platformOverride = process.env.PLATFORM;

  if (!monitorId) {
    fail("MONITOR_ID is required");
  }

  if (!fs.existsSync(MONITORS_PATH)) {
    fail("monitors.json not found");
  }

  const monitors = JSON.parse(fs.readFileSync(MONITORS_PATH, "utf8"));
  const monitor = monitors.find((m) => m.id === monitorId);

  if (!monitor) {
    fail(`Monitor not found: ${monitorId}`);
  }

  let channel;
  if (platformOverride) {
    channel = monitor.channels.find((c) => c.platform === platformOverride);
    if (!channel) {
      fail(`Platform ${platformOverride} not configured for monitor ${monitorId}`);
    }
  } else {
    channel = monitor.channels[0];
  }

  if (!channel || !channel.config) {
    fail("No valid channel config found");
  }

  console.log(`Sending test notification for monitor ${monitorId} via ${channel.platform}`);
  await sendTestNotification(channel.platform, channel.config);
  console.log("Test notification sent.");
}

main().catch((err) => {
  console.error("Failed to send test notification:", err.message);
  process.exit(1);
});
