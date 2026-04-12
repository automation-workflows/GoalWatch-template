// repair-monitors.js - Bulk repair for legacy monitor/channel verification fields

const fs = require("fs");
const path = require("path");

const MONITORS_PATH = path.join(__dirname, "../monitors.json");
const nowIso = new Date().toISOString();

function loadMonitors() {
  if (!fs.existsSync(MONITORS_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(MONITORS_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function inferChannelVerified(channel) {
  if (!channel || typeof channel !== "object") return false;
  if (channel.verified === true) return true;

  if (channel.platform === "discord" && channel.channelId) {
    return true;
  }

  if (channel.platform === "telegram" && channel.chatId) {
    return true;
  }

  return false;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const monitors = loadMonitors();

  let monitorTouched = 0;
  let channelVerifiedFixed = 0;
  let monitorVerifiedFixed = 0;

  for (const monitor of monitors) {
    let changed = false;

    if (!Array.isArray(monitor.channels)) {
      monitor.channels = [];
      changed = true;
    }

    for (const channel of monitor.channels) {
      const shouldBeVerified = inferChannelVerified(channel);
      if (shouldBeVerified && channel.verified !== true) {
        channel.verified = true;
        if (!channel.verifiedAt) channel.verifiedAt = nowIso;
        channelVerifiedFixed += 1;
        changed = true;
      }
    }

    const allChannelsVerified =
      monitor.channels.length > 0 && monitor.channels.every((c) => c && c.verified === true);

    if (monitor.verified !== allChannelsVerified) {
      monitor.verified = allChannelsVerified;
      monitorVerifiedFixed += 1;
      changed = true;
    }

    if (allChannelsVerified && !monitor.verifiedAt) {
      monitor.verifiedAt = nowIso;
      changed = true;
    }

    if (changed) {
      monitor.updatedAt = nowIso;
      monitorTouched += 1;
    }
  }

  if (!dryRun) {
    fs.writeFileSync(MONITORS_PATH, JSON.stringify(monitors, null, 2));
  }

  console.log(`Monitors scanned: ${monitors.length}`);
  console.log(`Monitors updated: ${monitorTouched}`);
  console.log(`Channels repaired: ${channelVerifiedFixed}`);
  console.log(`Top-level verified repaired: ${monitorVerifiedFixed}`);
  console.log(dryRun ? "Dry run: no file changes written" : "Saved monitors.json");
}

main();
