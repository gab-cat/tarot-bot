# Tarot Bot

A Facebook Messenger bot that gives three-card tarot readings (past, present, future)
written by Google Gemini, with follow-up questions, reading memory and paid plans
through Xendit. Built on Convex, with a small Vite + React site on Vercel.

- How it works: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Running and maintaining it: [docs/OPERATIONS.md](docs/OPERATIONS.md)
- Facebook profile errors (code 100/33): [docs/FACEBOOK_API_PERMISSIONS.md](docs/FACEBOOK_API_PERMISSIONS.md), [docs/WORKAROUNDS_FOR_PHONE_USERS.md](docs/WORKAROUNDS_FOR_PHONE_USERS.md)

## Plans

| Plan | Price | Readings per day | Follow-up questions per reading |
|---|---|---|---|
| Free Explorer | free | 1 | 1 |
| Mystic Guide | ₱49 for 30 days | 5 | 3 |
| Oracle Master | ₱99 for 30 days | unlimited | 5 |

Limits reset at midnight UTC (8:00 AM in Manila).

## Stack

- [Convex](https://convex.dev) 1.51 for the database, functions, scheduler and vector search (`convex/`)
- Gemini through `@google/genai` 3.x: `gemini-3.5-flash-lite` writes readings and replies, `gemini-embedding-2` for memory
- [TypeSafe Jev](https://docs.typesafe.ai) for typed judgments: emotion, what a typed message wants, which past readings are related
- Messenger Platform, Graph API v26.0
- Xendit invoices (PHP)
- Vite 8, React 19 and Tailwind 4 for the site (`src/`)
- Bun for installs, scripts and tests

## Setup

Needs Bun and Node 22.12 or newer.

```sh
bun install
npx convex dev          # links or creates a Convex deployment and writes .env.local
bun run dev             # the site on http://localhost:5173
```

Set the backend environment variables in the Convex dashboard. The full list is in
[docs/OPERATIONS.md](docs/OPERATIONS.md#environment-variables-convex-dashboard--settings--environment-variables).
To try the bot without any cloud deployment, see "Local development" in the same file.

In the Meta App Dashboard, point the Messenger webhook at
`https://<deployment>.convex.site/webhook` and subscribe to `messages` and
`messaging_postbacks`. In Xendit, set the invoice callback to
`https://<deployment>.convex.site/xendit/webhook`.

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Site dev server |
| `bun run dev:backend` | `convex dev`: pushes `convex/` on save |
| `bun run build` | Typecheck and build the site |
| `bun run typecheck` | Site, backend and tests |
| `bun run lint` | ESLint |
| `bun run test` | Unit tests in `tests/` |
| `bun run format` | Prettier on `convex/` and `tests/` |
| `bun run check` | Typecheck, lint, tests and the format check. Run before every deploy |
