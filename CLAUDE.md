# Tarot Bot

Facebook Messenger tarot bot on Convex, with Gemini writing the readings and Xendit taking
payments (PHP). `src/` is only a landing page and the payment success page. Gab's own
product; real people message the live Page and real money moves through it.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing the conversation,
payments or AI. One-off commands and env vars are in [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Commands

```sh
bun install
bun run check        # typecheck (site + convex + tests), lint, bun test, prettier --check
bun run build        # site build (also typechecks convex through the generated api)
bun run dev          # site
CONVEX_AGENT_MODE=anonymous npx convex dev   # local backend only; never touches cloud deployments
```

Bun for installs, scripts and tests (`bun test tests`). The site uses Vite 8; ignore the
`.cursor/rules` file that says to drop Vite. `specs/`, `.specify/` and `.cursor/plans/` are
history from earlier features, not the source of truth.

## Layout

- `convex/http.ts`: webhook routes only. Verify, normalise, schedule, return 200.
- `convex/messenger.ts`: the conversation (`handleEvents`), one handler per step (`onIdle`, `onBirthdateStep`, `onQuestionStep`, `onFollowupStep`). Buttons by payload, typed text by Jev, always with buttons in the reply.
- `convex/lib/`: plain helpers with no Convex imports: Graph API client (`messenger.ts`), text and chunking (`text.ts`), signature check, intents, time, webhook normalising. Unit-tested in `tests/`.
- `convex/ai/`: `gemini.ts` is the only Gemini client (writing); `jev.ts` the only TypeSafe Jev client (judging); model ids in `models.ts`; prompts in `prompts.ts`.
- `convex/constants.ts`: every message the bot sends, quick replies, prices, limits.
- `convex/validators.ts`: shared validators; `schema.ts` builds on them.

## Rules

- **Every Convex function is internal** except `payments:getPaymentByExternalId`. The deployment URL is public, and public functions used to let anyone message users from the Page, grant promos and spend the Gemini key. A new public function needs a reason and must take no identity from its arguments.
- **The webhook must answer in under 5 seconds.** Meta retries, then unsubscribes the app after an hour of failures. Do the work in `messenger:handleEvents`, never in the HTTP action.
- **Meta delivers duplicates.** `webhookEvents:claim` drops them. Anything that spends money or AI tokens must stay idempotent (see `users:beginReading`, `followups:reserveQuestion`, `payments:markPaid`).
- **Messenger limits:** 2000 characters per message (`sendText` splits), 20 characters per quick reply title (`tests/constants.test.ts`), 1000 per payload, and standard messages only within 24 hours of the user's last message (`users.lastMessageAt`).
- **Read the quick reply payload, not the title.** `normaliseEvent` puts the payload in `input`.
- **Daily limits reset at midnight UTC (8:00 AM Manila)** via `convex/lib/time.ts`. Don't use `new Date(y, m, d)` for day maths. Changing the reset is Gab's call.
- **Gemini failures throw.** The caller tells the user and gives back the reading or follow-up slot. Never fall back to a canned reading.
- **Jev judges, Gemini writes.** Classification, routing, relevance and yes/no checks go to Jev (`convex/ai/jev.ts`), not to a Gemini JSON prompt. Every Jev call returns null on failure and the caller falls back to the old behaviour. Thresholds were tuned on `jev-1.14.0`; re-test before changing the model or a question's wording.
- **Model writes `**bold**` Markdown; `formatForMessenger` converts it.** Don't ask the model for Unicode bold.
- **A scheduled mutation must not cancel its own job.** Since Convex 1.50 that throws and rolls back (`users:downgradeToFree` explains).
- **Convex `.filter()` takes `q.and(...)`, not `&&`.** `a && b` silently keeps only `b`; four filters had that bug. Prefer an index or filtering in JS on a bounded `.take()`.
- **Schema changes are widen, migrate, narrow.** Legacy fields still in the schema: `readings.embedding` (until `migrations:backfillReadingEmbeddings` runs on prod) and `users.followupSessionsToday`.
- **Bot copy is Gab's voice.** Keep the persona in `convex/ai/prompts.ts` and the messages in `convex/constants.ts` as they are unless asked. Prices, limits and promises in copy are business decisions.
- **Ask Gab before:** `npx convex deploy`, setting or changing prod env vars, running a migration or promo on prod, messaging real users, anything touching payments or plan limits.
