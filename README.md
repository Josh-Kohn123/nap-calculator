# Nap Wake-Up Helper 🍼🌙

A tiny React + TypeScript app that tells you when to wake baby from their current nap so bedtime lands in a target window.

## Model

You pick:
- **Target bedtime range** (earliest / latest — usually within an hour)
- **Remaining naps after the current one** — duration of each
- **Wake windows** — one between each nap and one leading to bedtime (always one more wake window than remaining naps)

The app computes:

```
wake_from_current_nap = bedtime − (sum of wake windows) − (sum of remaining naps)
```

...giving you a range: earliest-bedtime → earliest wake, latest-bedtime → latest wake.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Pushes to this repo's main branch deploy to Vercel automatically.
