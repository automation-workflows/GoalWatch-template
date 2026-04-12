// check-goals.js - Daily cron engine for GoalWatch

const fs = require("fs");
const path = require("path");
const { sendPlatformNotification } = require("./notify.js");

const MONITORS_PATH = path.join(__dirname, "../monitors.json");
const STATE_PATH = path.join(__dirname, "../state.json");
const POLLINATIONS_URL = "https://text.pollinations.ai/";

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

function parseGoalResponse(raw) {
  const statusMatch = raw.match(/STATUS:\s*(MET|NOT_MET)/i);
  const reasonMatch = raw.match(/REASON:\s*(.+)/i);
  const clean = raw.trim();
  const looksLikeErrorJson = clean.startsWith("{") && clean.includes("\"error\"");
  return {
    met: statusMatch ? statusMatch[1].toUpperCase() === "MET" : false,
    reason: reasonMatch
      ? reasonMatch[1].trim()
      : looksLikeErrorJson
        ? "LLM provider returned an API error"
        : raw.slice(0, 140).trim()
  };
}

function hasStructuredGoalAnswer(text) {
  return /STATUS:\s*(MET|NOT_MET)/i.test(text) && /REASON:\s*/i.test(text);
}

function isProviderError(text) {
  const t = text.trim();
  return t.includes("Model not found") || (t.startsWith("{") && t.includes("\"error\""));
}

function fallbackEval(pageText, goal) {
  const numberInGoal = goal.match(/(\d+(?:\.\d+)?)/);
  const numberInPage = pageText.match(/(\d+(?:\.\d+)?)/);

  if (numberInGoal && numberInPage) {
    const goalNum = parseFloat(numberInGoal[1]);
    const pageNum = parseFloat(numberInPage[1]);
    const met = pageNum >= goalNum;
    return {
      met,
      reason: `Found ${pageNum} on page, goal requires ${goalNum}`
    };
  }

  return {
    met: false,
    reason: "LLM unavailable and numeric fallback could not evaluate goal"
  };
}

async function evaluateGoal(pageText, goal) {
  const trimmed = pageText.slice(0, 3000);
  const prompt = [
    `Page content (first 3000 chars): ${trimmed}`,
    `Goal: ${goal}`,
    "Reply EXACTLY:",
    "STATUS: MET",
    "REASON: one sentence",
    "or",
    "STATUS: NOT_MET",
    "REASON: one sentence"
  ].join("\n");

  const attempts = [
    {
      messages: [{ role: "user", content: prompt }],
      model: "openai",
      seed: 42,
      private: true
    },
    {
      messages: [{ role: "user", content: prompt }],
      seed: 42,
      private: true
    }
  ];

  for (const body of attempts) {
    try {
      const res = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      if (!res.ok) continue;
      if (hasStructuredGoalAnswer(text)) return parseGoalResponse(text);
      if (isProviderError(text)) continue;
    } catch {
      // Try next attempt.
    }
  }

  return fallbackEval(pageText, goal);
}

async function scrapePage(url) {
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; GoalWatch/1.0)",
      "Accept": "text/html,application/json,*/*"
    },
    signal: AbortSignal.timeout(15000)
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const raw = await res.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function main() {
  const monitors = loadJson(MONITORS_PATH, []);
  const state = loadJson(STATE_PATH, {});

  const active = monitors.filter((m) => m.active && m.verified);
  console.log(`GoalWatch: checking ${active.length} active monitor(s)`);

  for (const monitor of active) {
    try {
      console.log(`- ${monitor.id} | ${monitor.site}`);
      const pageText = await scrapePage(monitor.site);
      const result = await evaluateGoal(pageText, monitor.goal);

      const prev = state[monitor.id] || {};
      const alreadyNotified = prev.met === true && result.met === true;

      const checkedAtIst = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
      const message = {
        goalMet: result.met,
        goal: monitor.goal,
        reason: result.reason,
        site: monitor.site,
        checkedAtIst
      };

      if (!alreadyNotified) {
        for (const channel of monitor.channels || []) {
          if (!channel.verified) continue;
          try {
            await sendPlatformNotification(channel, message);
            console.log(`  sent -> ${channel.platform}`);
          } catch (err) {
            console.error(`  send failed (${channel.platform}): ${err.message}`);
          }
        }
      } else {
        console.log("  skipped duplicate met notification");
      }

      state[monitor.id] = {
        met: result.met,
        reason: result.reason,
        lastChecked: new Date().toISOString()
      };
    } catch (err) {
      console.error(`  monitor error: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  saveJson(STATE_PATH, state);
  console.log("GoalWatch: done");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
