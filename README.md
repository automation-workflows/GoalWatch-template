# GoalWatch

GoalWatch is a zero-server goal alert system for websites, dashboards, and custom event pages. It watches a page, decides whether a natural-language goal has been met, and sends a notification to Telegram or Discord.

## Why it exists

Many products need a simple alert button for a user-driven event:

- “Notify me when my portfolio hits a target”
- “Alert me when this Web3 event happens”
- “Let me know when the score, price, or ratio crosses a threshold”
- “Start receiving updates when a client-defined condition becomes true”

GoalWatch is designed for that exact pattern.

## Product flow

1. A user writes the goal in plain language ( In the MVP, user have to add URL also; later, developers can move it into a secret or site config so the input is only the goal, url is eaily fetch by current url of client).
2. They choose Telegram or Discord to receive alerts.
3. They click the platform link and confirm a test message.
4. GitHub Actions stores the monitor in `monitors.json`.
5. A daily cron job checks the page and sends an alert when the goal is met.

## Use cases

- Finance alerts for tokens, prices, ratios, or wallet-related dashboards.
- Web3 event watchers for on-chain or off-chain status pages.
- Sports score and live match thresholds.
- Product monitoring for landing page changes, counts, or status flags.
- Custom client workflows where the user defines the event in their own words.

## Current MVP notes

- The frontend still uses a temporary GitHub PAT for workflow dispatch.
- That PAT is only for the MVP.
- Later, you can move dispatch into a server-side secret on your own site.

## Docs

- [Architecture](docs/architecture.md)
- [Internal implementation notes](docs/internal.md)
- [Use cases](docs/use-cases.md)

## What ships with the repo

- Static frontend in [index.html](index.html)
- Git-backed monitor storage in [monitors.json](monitors.json)
- Run state in [state.json](state.json)
- GitHub Actions workflows under [.github/workflows](.github/workflows)
- Runtime scripts under [scripts](scripts)

## Secrets you need

- `TELEGRAM_BOT_TOKEN`
- `DISCORD_BOT_TOKEN`

## Bot config you must set

- Telegram bot username in [index.html](index.html)
- Discord bot id in [index.html](index.html)

## File layout

```text
.
├── index.html
├── monitors.json
├── state.json
├── docs/
├── scripts/
└── .github/workflows/
```
