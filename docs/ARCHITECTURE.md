# How the tarot bot works

A Facebook Messenger bot that gives three-card tarot readings written by Gemini. The
backend is Convex. The only web page is a marketing site plus the payment success page,
deployed on Vercel.

## A message, end to end

1. Meta POSTs the event to `/webhook` (`convex/http.ts`).
2. The handler checks `X-Hub-Signature-256` against `FACEBOOK_APP_SECRET`, normalises the
   events (`convex/lib/webhook.ts`), groups them by sender in timestamp order, schedules
   `messenger:handleEvents` and returns 200. Meta wants that 200 within 5 seconds, retries
   right away otherwise, and unsubscribes the app after an hour of failures, so no real
   work happens in the HTTP handler.
3. `messenger:handleEvents` (`convex/messenger.ts`) claims each event in `webhookEvents`
   (a retry of an event we already took is dropped) and runs the conversation.
4. Replies go out through `convex/lib/messenger.ts` (Graph API `v26.0`), split at
   Messenger's 2000-character limit.

A quick reply's payload, not its title, is what the bot reads. "💼 Career & Work" arrives
as the question "What's my career path?". Typed text is read by Jev (below): with no
session, "Will my ex come back?" starts the reading straight away; in the follow-up
window, "salamat po" gets a thank-you instead of using up a question.

## Conversation state

State is `users.sessionState`, plus the follow-up state on the user's latest reading. Each
state has its own handler in `convex/messenger.ts` (`onIdle`, `onBirthdateStep`,
`onQuestionStep`, `onFollowupStep`). Buttons are read by payload; typed text is read by
Jev with the options that make sense at that step. Every reply still carries buttons.

| State | What a typed message can do |
|---|---|
| none | A question starts the reading (or is held until the birthdate arrives); also start, about me, upgrade, how it works, greeting |
| `waiting_birthdate` | Any common date format is saved (`parseBirthdate`); "why?" gets an explanation; a question is held in `users.pendingQuestion` and read once the birthdate arrives; stop, about me, upgrade |
| `waiting_question` | Becomes the reading question, unless Jev is fairly sure it's "ok", a greeting, about me, upgrade or stop |
| `reading_in_progress` | "Still reading your cards". Treated as none after 5 minutes, so a crashed reading can't lock anyone out |
| `reading_complete` (5 seconds) | "Your recent reading is still fresh" |
| follow-up window (10 minutes, on the reading) | A follow-up question, unless it's thanks (no question used), goodbye (ends), new cards (starts over), about me or upgrade (window stays open) |

## A reading

`handleQuestion` in `convex/messenger.ts`:

1. `users:canReadToday`: free 1 per day, Mystic 5, Oracle unlimited, or an active promo.
2. `users:beginReading` claims the question.
3. In parallel: emotion (Jev, `readEmotion`) and reading memory
   (`buildReadingMemoryContext`: a vector search over the user's own past readings, then
   Jev keeps the ones about the same situation).
4. `drawThreeCards` (`convex/tarot.ts`) and `generateReading` (`convex/ai/gemini.ts`) with
   Google Search grounding for today's astrology.
5. If Gemini fails, the user is told, keeps their reading, and gets a "Try again" button
   that resends the same question.
6. Otherwise the reading is saved (`readings:createReading`, which also bumps
   `readingCount`, schedules the "readings available" notice and the embedding), then the
   card images, card summary and interpretation are sent and the follow-up window opens.

## AI

Gemini writes; Jev judges. All Gemini calls go through `convex/ai/gemini.ts`, all Jev calls
through `convex/ai/jev.ts`. Model ids are in `convex/ai/models.ts`, prompts in
`convex/ai/prompts.ts`.

| Use | Model | Notes |
|---|---|---|
| Reading | `gemini-3.5-flash-lite` (env `GEMINI_READING_MODEL`) | Google Search grounding, low thinking |
| Follow-up answer | same model | Minimal thinking, no search |
| "About me" blurb | `gemini-3.5-flash-lite` (env `GEMINI_FAST_MODEL`) | Minimal thinking |
| Emotion, what a typed message wants, which past readings are related | Jev `jev-1.14.0` (env `TYPESAFE_MODEL`) | About 200 ms per call |
| Memory search | `gemini-embedding-2`, 1536 dims | Text prefixes instead of `taskType` |

`gemini-2.5-pro`, which readings used until Nov 2026, shuts down on the Gemini API on
2026-12-01. `gemini-3.5-flash-lite` is Google's lowest-cost general model; if readings
need more depth, set `GEMINI_READING_MODEL=gemini-3.8-flash` (about 3x the cost) in the
dashboard, no deploy needed.

### Jev (TypeSafe)

Jev returns typed answers with probabilities instead of text. Each function in
`convex/ai/jev.ts` returns null when `TYPESAFE_API_KEY` is missing or the call fails, and
the bot then behaves as it did before Jev: keyword checks for typed text, no emotion
tone, a plain cosine cut-off for memory. Thresholds live at the top of
`convex/messenger.ts` and `convex/embeddings.ts`:

| Judgment | Acts when | What happens |
|---|---|---|
| Typed text with no session is a tarot question | p ≥ 0.8 | Reading starts (or the question is held until the birthdate arrives) |
| Any other intent at any step (menu, explanation, re-ask, stop) | p ≥ 0.6 | That reply |
| At the question step, the text is not the question | p ≥ 0.7 | That reply instead of spending the reading |
| In the follow-up window, the text is not a question | p ≥ 0.8 | Thanks, goodbye, new cards, about me or upgrade |
| Past reading is about the same situation | p ≥ 0.5 | Included in the prompt (top 3) |

The step questions scored 49/49 on English and Taglish test messages (the closest right
answer was 0.88); emotion and memory 20/21. They are pinned to `jev-1.14.0` so a new
release can't shift them. Re-check on real traffic before tightening
or loosening. The model writes `**bold**` Markdown, and `formatForMessenger`
(`convex/lib/text.ts`) converts it to Unicode bold, because Messenger shows plain text.

## Reading memory

Each reading is embedded once into `readingEmbeddings` (kept out of `readings` so reading
a reading never loads a vector). A new question is embedded and matched against that
user's rows with `ctx.vectorSearch(..., filter: userId)`. Up to 6 candidates go to Jev,
which keeps those about the same situation, person or goal. Before Nov 2026 the "semantic" lookup ignored the embedding and returned
the latest readings, so `migrations:backfillReadingEmbeddings` is needed once on prod.

## Money

Mystic ₱49 and Oracle ₱99, each for 30 days, through Xendit invoices:

1. Quick reply `UPGRADE_MYSTIC` / `UPGRADE_ORACLE` → `startCheckout` (`convex/payments.ts`)
   creates the invoice, records it as `PENDING` and sends the payment link.
2. Xendit calls `/xendit/webhook` with `x-callback-token`. `payments:markPaid` marks the
   invoice paid and upgrades the user in one transaction, so a retry can't upgrade twice.
3. `users:downgradeToFree` runs from the scheduler when the 30 days are up.

Only free users can check out. A payment that arrives while the user is already paid, or
for less than the invoice amount, is marked paid and logged for a human to sort out.

## Scheduled work

| What | When | Where |
|---|---|---|
| "Your daily readings are now available" | next reset after a limited user hits the limit | `convex/notifications.ts` |
| End of the follow-up window | 10 minutes after a reading | `followups:autoEndFollowupSession` |
| Subscription expiry | 30 days after payment | `users:downgradeToFree` |
| Promo start and end announcements | promo start and end | `convex/promotions.ts` |
| Purge `webhookEvents` older than 7 days | daily, 19:00 UTC | `convex/crons.ts` |

The daily reset is midnight UTC, which is 8:00 AM in Manila (`convex/lib/time.ts`).

Messenger only allows standard messages within 24 hours of the user's last message
(`users.lastMessageAt`). The daily notice always lands inside that window. Promo
announcements only go to users who messaged in the last 24 hours.

## Public surface

- HTTP: `GET/POST /webhook`, `POST /xendit/webhook`.
- Convex functions: only `payments:getPaymentByExternalId`, which the success page reads
  and which returns status, plan, amount, currency and dates. Everything else is
  internal and can only be called by other functions or `npx convex run`.

## Frontend

`src/` is a Vite + React landing page (`/`) and the Xendit success page
(`/xendit/success`, `src/components/SuccessPage.tsx`). Only the success route loads the
Convex client (`src/SuccessRoute.tsx`).
