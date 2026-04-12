# GoalWatch Architecture

```mermaid
flowchart LR
  U[Client / User] --> F[index.html on GitHub Pages]
  F -->|workflow_dispatch| A[add-monitor.yml]
  F -->|workflow_dispatch| D[discord-verify.yml]
  F -->|workflow_dispatch| T[telegram-intake.yml]
  A --> M[(monitors.json)]
  T --> M
  D --> M
  C[cron.yml daily 9AM IST] --> S[scripts/check-goals.js]
  S --> P[Pollinations.ai]
  S --> N[scripts/notify.js]
  N --> TG[Telegram API]
  N --> DC[Discord API]
  S --> ST[(state.json)]
  M --> C
```

## Read the diagram

- The frontend is static and can be hosted on GitHub Pages.
- GitHub Actions handle all updates to monitor data and notifications.
- `monitors.json` is the source of truth for active monitors.
- `state.json` stores the last evaluation result so the same "goal met" event is not spammed.
- Pollinations.ai is used only for reasoning, not as a hosted backend.

## Trust boundary

- Browser input is public and temporary.
- GitHub Actions are the execution layer.
- Secrets stay inside GitHub Secrets.
- GitHub PAT is only a temporary MVP dispatch method.
