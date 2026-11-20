# Operations

Commands run against whichever deployment `npx convex` points at: `.env.local` for dev,
`--prod` for production. Run anything that writes data on dev first, and get Gab's yes
before running it on prod.

## Environment variables (Convex dashboard → Settings → Environment variables)

| Name | Used for |
|---|---|
| `ACCESS_TOKEN` | Page access token for the Send API |
| `VERIFY_TOKEN` | Webhook verify token (falls back to `APP_SECRET`, the old name) |
| `FACEBOOK_APP_SECRET` | Checks `X-Hub-Signature-256` on every webhook. If missing but `APP_SECRET` is set, each webhook logs whether its signature matches `APP_SECRET` without enforcing it; once the logs say it matches, set `FACEBOOK_APP_SECRET` to the same value |
| `GEMINI_API_KEY` | Gemini |
| `GEMINI_READING_MODEL`, `GEMINI_FAST_MODEL` | Optional model overrides, see `convex/ai/models.ts` |
| `TYPESAFE_API_KEY` | Jev. Without it the bot falls back to keyword checks and skips emotion |
| `TYPESAFE_MODEL` | Optional Jev override; default `jev-1.14.0`, which the thresholds were tuned on |
| `XENDIT_SECRET_KEY` | Creating invoices |
| `XENDIT_CALLBACK_TOKEN` | Checking Xendit callbacks |
| `REDIRECT_URL` | Base URL of the Vercel site, for Xendit's success and failure redirects |

The Vercel site needs `VITE_CONVEX_URL`.

No longer read: `APP_BASE_URL` (the bot used to call its own `/xendit/checkout`, which is
gone), `EMOTION_MODEL`, `INTERPRETATION_MODEL`.

## Deploying

```sh
bun run check            # typecheck, lint, tests, formatting
npx convex deploy        # backend (prod). Gab's call.
```

The frontend deploys from Vercel. New indexes on big tables make `convex deploy` ask for
confirmation (Convex 1.47+).

## One-off commands

```sh
# Messenger Page setup: Get Started button and greeting
npx convex run facebookApi:setupWelcomeScreen

# Upload all 78 card images to Messenger and cache the attachment ids
npx convex run imageActions:initializeCardImages

# Readings that got the old canned fallback text, and a real redo for one of them
# (send: false returns the text without saving or sending; never sends outside 24 hours)
npx convex run admin:findFallbackReadings
npx convex run admin:redoReading '{"readingId": "<id>", "send": false}'

# Fill in names for users who have none (fails for phone-only Facebook accounts,
# see FACEBOOK_API_PERMISSIONS.md)
npx convex run users:migrateUserProfiles '{"dryRun": true}'
npx convex run users:migrateUserProfiles '{"batchSize": 5}'

# Backfill subscription dates for paid users from before subscriptions expired
npx convex run users:migrateExistingSubscriptions
```

## Promotions

```sh
# Unlimited readings for everyone for 3 days, starting now
npx convex run promotions:createPromotionalPeriod '{"durationDays": 3}'

# Only some tiers or users, or starting later (startDate in ms)
npx convex run promotions:createPromotionalPeriod '{"durationDays": 2, "targetedUserTypes": ["free"]}'
npx convex run promotions:createPromotionalPeriod '{"durationDays": 1, "startDate": 1795392000000}'

npx convex run promotions:listPromotionalPeriods
npx convex run promotions:deactivatePromotionalPeriod '{"promoId": "<id>"}'
```

Overlapping promotions are refused. Start and end announcements only reach users who
messaged in the last 24 hours (Messenger policy). Each announcement logs
`sent X/Y`.

## Local development without touching any cloud deployment

```sh
CONVEX_AGENT_MODE=anonymous npx convex dev   # local backend on 127.0.0.1:3210, HTTP on :3211
npx convex env set FACEBOOK_APP_SECRET test-secret   # and the other variables, with fake values
```

Sign test webhook bodies with the same secret (`signMessengerBody` in
`convex/lib/signature.ts`) and POST them to `http://127.0.0.1:3211/webhook`. Outbound calls
to Facebook and Gemini fail with fake keys, which exercises the error paths.

## Where to look when something breaks

- Convex dashboard → Logs. Every failure logs a plain message ("Reading generation failed",
  "Messenger send failed", "Rejected a webhook POST with a bad X-Hub-Signature-256").
- Meta App Dashboard → Webhooks, for delivery failures and the "Webhooks disabled" alert.
- Xendit Dashboard → Callbacks, for callback retries.
