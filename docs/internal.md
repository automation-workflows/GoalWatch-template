# GoalWatch Internal Notes

## Data model

### `monitors.json`

Each monitor should contain:

- `id`
- `site`
- `goal`
- `sessionToken`
- `active`
- `verified`
- `createdAt`
- `updatedAt`
- `channels[]`

Each channel can contain:

- `platform` (`telegram` or `discord`)
- `sessionToken` for Telegram onboarding
- `userId` for Discord onboarding
- `chatId` after Telegram verification
- `channelId` after Discord DM creation
- `verified`

### `state.json`

- `telegramLastUpdateId` stores the last processed Telegram update.
- Each monitor id stores last check metadata.

## Workflow responsibilities

### `add-monitor.yml`

- Creates or updates a monitor.
- Marks a channel verified once the onboarding data exists.
- Deactivates a monitor when requested.

### `telegram-intake.yml`

- Polls Telegram `/getUpdates` every 15 minutes.
- Finds `/start <sessionToken>` messages.
- Resolves `chatId` automatically.
- Sends a `hi` DM.
- Marks Telegram channel verified.

### `discord-verify.yml`

- Opens a Discord DM channel for the user.
- Sends a `hi` DM.
- Stores the returned `channelId`.

### `repair-monitors.yml`

- Repairs legacy verification fields in `monitors.json`.
- Infers channel verification when IDs already exist.
- Recomputes top-level `monitor.verified` consistently.
- Supports dry-run execution for safe previews.

### `cron.yml`

- Runs daily at 9:00 AM IST.
- Scrapes the page.
- Evaluates the goal with Pollinations.ai.
- Falls back to numeric parsing if the LLM fails.
- Sends Telegram or Discord notification.
- Writes the latest result to `state.json`.

## Frontend behavior

- The frontend uses `workflow_dispatch` for the MVP.
- GitHub PAT is temporary.
- The planned production version should move dispatch secrets to the owner site/backend.
- The URL input in the MVP is user-entered for flexibility; later it can be moved into a developer-managed secret or site config so end users no longer need to type it.

## Important implementation notes

- Keep the bot names and IDs in `index.html` in sync with the real bots.
- Do not add more channels unless the workflows know how to verify them.
- Bot commits should not redeploy GitHub Pages if the Pages workflow skips bot-authored commits.
