// check-goals.js — GoalWatch main cron engine
// LLM: Pollinations.ai (zero auth, zero API key)
// Run: node scripts/check-goals.js

const fs = require("fs");
const path = require("path");
const { sendNotification } = require("./notify.js");

const MONITORS_PATH = path.join(__dirname, "../monitors.json");
const POLLINATIONS_URL = "https://text.pollinations.ai/";

function loadMonitors() {
  try {
    if (!fs.existsSync(MONITORS_PATH)) {
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(MONITORS_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── LLM: Pollinations.ai ────────────────────────────────────────────────────

async function evaluateGoal(pageText, goal) {
  // Trim page text to avoid overloading the free LLM
  const trimmed = pageText.slice(0, 3000);

  const prompt = `You are a goal checker. Given page content and a goal, decide if the goal is met.

PAGE CONTENT:
${trimmed}

GOAL: "${goal}"

Reply in this EXACT format (no extra text):
STATUS: MET
REASON: one sentence explaining why

Or:
STATUS: NOT_MET
REASON: one sentence explaining why`;

  try {
    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "mistral",       // free, no auth
        seed: 42,
        private: true           // don't log to pollinations feed
      })
    });

    const text = await res.text();
    return parseGoalResponse(text);
  } catch (err) {
    console.error("  LLM error:", err.message);
    // Fallback: try simple keyword extraction
    return fallbackEval(pageText, goal);
  }
}

function parseGoalResponse(raw) {
  const statusMatch = raw.match(/STATUS:\s*(MET|NOT_MET)/i);
  const reasonMatch = raw.match(/REASON:\s*(.+)/i);

  return {
    met: statusMatch ? statusMatch[1].toUpperCase() === "MET" : false,
    reason: reasonMatch ? reasonMatch[1].trim() : raw.slice(0, 120)
  };
}

// Simple numeric fallback — no LLM needed for basic number goals
function fallbackEval(text, goal) {
  const numberInGoal = goal.match(/(\d+(?:\.\d+)?)/);
  const numberInPage = text.match(/(\d+(?:\.\d+)?)/);

  if (numberInGoal && numberInPage) {
    const goalNum = parseFloat(numberInGoal[1]);
    const pageNum = parseFloat(numberInPage[1]);
    const met = pageNum >= goalNum;
    return {
      met,
      reason: `Found ${pageNum} on page, goal requires ${goalNum}`
    };
  }

  return { met: false, reason: "Could not evaluate — LLM unavailable, no numbers found" };
}

// ─── Scraper ─────────────────────────────────────────────────────────────────

async function scrapePage(url) {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(fullUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoalWatch/1.0)",
        "Accept": "text/html,application/json,*/*"
      },
      signal: AbortSignal.timeout(15000)
    });

    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();

    if (contentType.includes("application/json")) {
      return JSON.stringify(JSON.parse(raw), null, 2);
    }

    // Strip HTML tags for cleaner LLM input
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

  } catch (err) {
    throw new Error(`Scrape failed for ${url}: ${err.message}`);
  }
}

// ─── State management (track yesterday's values) ─────────────────────────────

const STATE_PATH = path.join(__dirname, "../state.json");

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const monitors = loadMonitors();
  const state = loadState();

  const active = monitors.filter(m => m.verified && m.active);
  console.log(`GoalWatch: checking ${active.length} active monitors...\n`);

  for (const monitor of active) {
    console.log(`[${monitor.id}] ${monitor.goal}`);
    console.log(`  Site: ${monitor.site}`);

    try {
      // 1. Scrape
      const pageText = await scrapePage(monitor.site);
      console.log(`  Scraped: ${pageText.length} chars`);

      // 2. Evaluate goal
      const result = await evaluateGoal(pageText, monitor.goal);
      console.log(`  Status: ${result.met ? "✅ MET" : "⏳ NOT MET"}`);
      console.log(`  Reason: ${result.reason}`);

      // 3. Check if goal was already met yesterday (avoid repeat spam)
      const prevState = state[monitor.id] || {};
      const alreadyNotified = prevState.met === true && result.met === true;

      if (alreadyNotified) {
        console.log(`  Skipping notification — goal already met previously`);
        continue;
      }

      // 4. Build notification
      const message = {
        title: `Goal Watch: ${monitor.site}`,
        body: [
          `**Goal:** ${monitor.goal}`,
          `**Status:** ${result.met ? "✅ Goal Met!" : "⏳ Not yet"}`,
          `**Update:** ${result.reason}`,
          `\n_Checked: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}_`
        ].join("\n"),
        goalMet: result.met
      };

      // 5. Send notifications to all verified platforms
      for (const channel of monitor.channels) {
        if (channel.verified) {
          await sendNotification(channel.platform, channel.config, message);
        }
      }

      // 6. Save state
      state[monitor.id] = {
        met: result.met,
        reason: result.reason,
        lastChecked: new Date().toISOString()
      };

    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }

    console.log();
    // Polite delay between monitors
    await new Promise(r => setTimeout(r, 2000));
  }

  saveState(state);
  console.log("GoalWatch: done.");
}

main().catch(console.error);
