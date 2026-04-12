# ⚡ GoalWatch

Monitor any website for a natural language goal. Get notified when it happens.  
**Zero server. Zero cost. Runs entirely on GitHub Actions.**

## How it works

```text
Client fills form (index.html)
  → monitors.json updated via GitHub API
  → Test notification sent via GitHub Actions
  → Client verifies ✅
  → Daily cron checks goal using Pollinations.ai (free LLM, no API key)
  → Notification sent to Discord / Telegram / Slack / Webhook
```

## Setup (5 minutes)

### 1. Fork / create this repo

Make it **private** (webhooks are stored in monitors.json).

### 2. Enable GitHub Actions

Settings → Actions → Allow all actions.

### 3. Create a PAT (Personal Access Token)

Settings → Developer Settings → Fine-grained tokens:

- Repo: this repo only
- Permissions: `Actions: Write`, `Contents: Write`

### 4. Update index.html

```js
const GH_OWNER = "your-username";   // line ~175
const GH_REPO  = "event";           // use your actual repo name
const GH_TOKEN = "ghp_xxxx";        // your PAT
```

> ⚠️ For a real product, proxy this through a Cloudflare Worker  
> so the PAT isn't exposed in frontend JS.

### 5. Deploy index.html

- GitHub Pages (Settings → Pages → main branch)
- Or Vercel / Netlify (drag and drop)

### 6. Done! Share the URL with your clients

## File structure

```text
goalwatch/
├── index.html              ← client-facing setup UI
├── monitors.json           ← config database (auto-updated)
├── state.json              ← tracks last check state (auto-updated)
├── scripts/
│   ├── check-goals.js      ← main cron engine (Pollinations.ai)
│   ├── notify.js           ← multi-platform notifications
│   └── send-test.js        ← test notification sender
└── .github/workflows/
    ├── cron.yml            ← daily 9AM IST check
    ├── verify.yml          ← sends test notification
    └── add-monitor.yml     ← adds/updates monitors.json
```

## Supported notification platforms

| Platform | What you need |
| --- | --- |
| Discord | Webhook URL |
| Telegram | Bot token + Chat ID |
| Slack | Incoming webhook URL |
| Custom | Any POST endpoint |

## Custom Webhook Testing

Fast way to test without your own backend:

1. Open webhook.site and copy the unique URL.
2. In setup step 2, select Webhook and paste that URL.
3. Click Send Test Notification.
4. Confirm the POST payload appears in webhook.site, then click verify.

Payload sent to custom webhook:

```json
{
  "title": "GoalWatch Test Notification",
  "body": "...",
  "goalMet": true,
  "emoji": "✅",
  "timestamp": "2026-04-12T00:00:00.000Z",
  "source": "goalwatch"
}
```

## monitors.json schema

```json
[
  {
    "id": "abc123",
    "site": "cricbuzz.com/match/123",
    "goal": "LSG scores more than 180 runs",
    "active": true,
    "verified": false,
    "createdAt": "2026-04-12T00:00:00.000Z",
    "channels": [
      {
        "platform": "discord",
        "config": { "webhook": "https://discord.com/api/webhooks/..." },
        "verified": false
      }
    ]
  }
]
```

## LLM: Pollinations.ai

- Zero API key, zero auth, zero cost
- Model: `mistral` (via Pollinations free tier)
- Falls back to numeric parsing if LLM fails
- Private mode enabled (responses not logged publicly)

## Cron schedule

Default: `30 3 * * *` = 9:00 AM IST daily.  
Change in `.github/workflows/cron.yml`.
