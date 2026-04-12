# GoalWatch

GoalWatch is a zero-server website goal monitor powered by GitHub Actions.

## How it works

1. Client opens static frontend (`index.html`).
2. Client enters site URL + natural-language goal.
3. Client chooses Telegram or Discord.
4. Frontend dispatches GitHub Actions workflows.
5. Workflows store monitor data in `monitors.json`.
6. Daily cron checks goals with Pollinations.ai and sends notifications.

## Features

- Zero backend server
- Static frontend (GitHub Pages compatible)
- Storage in git files (`monitors.json`, `state.json`)
- Daily goal checks at 9:00 AM IST
- Telegram + Discord notifications
- Pollinations.ai free model (`mistral`) with fallback numeric parsing

## Required GitHub Secrets

- `TELEGRAM_BOT_TOKEN`
- `DISCORD_BOT_TOKEN`

## Required PAT for frontend dispatch

Frontend dispatches `workflow_dispatch` directly to GitHub API.
Use a token with:

- `Actions: Write`
- `Contents: Write`

The token is prompted once and saved in browser localStorage (`goalwatch_pat`).

## Frontend bot link config

Update these constants in `index.html` for your deployment:

- `TELEGRAM_BOT_USERNAME`
- `DISCORD_BOT_ID`

## Workflows

- `.github/workflows/add-monitor.yml`
  - `workflow_dispatch`
  - actions: `add | verify | deactivate`
  - updates `monitors.json`

- `.github/workflows/telegram-intake.yml`
  - schedule every 15 minutes + manual dispatch
  - polls Telegram `/start <sessionToken>` via `getUpdates`
  - resolves chat id and verifies Telegram channel
  - sends `hi`

- `.github/workflows/discord-verify.yml`
  - `workflow_dispatch`
  - opens DM channel from `user_id`
  - sends `hi`
  - stores Discord `channelId`

- `.github/workflows/cron.yml`
  - daily 9:00 AM IST (`30 3 * * *`) + manual dispatch
  - scrapes site
  - evaluates goal with Pollinations.ai
  - sends notification
  - updates `state.json`

## File structure

```text
.
├── index.html
├── monitors.json
├── state.json
├── scripts/
│   ├── check-goals.js
│   ├── notify.js
│   ├── telegram-intake.js
│   └── discord-verify.js
└── .github/workflows/
    ├── add-monitor.yml
    ├── telegram-intake.yml
    ├── discord-verify.yml
    └── cron.yml
```

## Data schema

`monitors.json`

```json
[
  {
    "id": "abc123",
    "site": "api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    "goal": "Bitcoin price is above $50,000",
    "sessionToken": "abc123",
    "active": true,
    "verified": false,
    "createdAt": "2026-04-13T00:00:00.000Z",
    "updatedAt": "2026-04-13T00:00:00.000Z",
    "channels": [
      {
        "platform": "telegram",
        "sessionToken": "abc123",
        "chatId": null,
        "verified": false
      },
      {
        "platform": "discord",
        "userId": "1234567890",
        "channelId": null,
        "verified": false
      }
    ]
  }
]
```

`state.json`

```json
{
  "telegramLastUpdateId": 0,
  "abc123": {
    "met": false,
    "reason": "one sentence",
    "lastChecked": "2026-04-13T00:00:00.000Z"
  }
}
```
