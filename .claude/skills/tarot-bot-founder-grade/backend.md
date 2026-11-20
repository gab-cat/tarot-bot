# Backend in Tarot Bot: cheap, fast, correct

The goal is the least expensive design that still gives superb quality, and that is
fast. The money goes to Gemini (per token and per Google Search query) far more than to
Convex. Speed matters because a person is staring at "Whispering to the cards..." and
because Meta drops webhooks that take longer than 5 seconds. When you don't know the
pattern that is both cheap and fast, research it before you build.

## Required reading

- [CLAUDE.md](../../../CLAUDE.md) rules, [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).
- Convex docs for anything new: functions, scheduling, vector search, and the changelog (behaviour changes ship in minors).
- Gemini: the deprecations page and pricing page at aistudio.google.com/docs before touching `convex/ai/models.ts`.

## Estimate before you build

Rough cost of one reading at Nov 2026 list prices (estimates, not measured):

| Step | Model | Cost |
|---|---|---|
| Reading, ~2.5k tokens in, ~0.6k out plus low thinking | `gemini-3.5-flash-lite` ($0.30 / $2.50 per 1M) | about $0.003 |
| Google Search grounding | Gemini 3 grounding: 5,000 free searches a month, then $14 per 1,000 | $0 under the free tier, about $0.014 per search above it |
| Emotion, intent, memory relevance | Jev `jev-1.14.0` ($0.042 per 1M input tokens, output free) | about $0.00003 per call, ~200 ms |
| Two embeddings | `gemini-embedding-2` ($0.20 per 1M) | about $0.0002 |
| Follow-up answer | `gemini-3.5-flash-lite`, minimal thinking, no search | about $0.001 |

Switching readings to `gemini-3.8-flash` costs about 3x now and 6x from Jan 1, 2027
($1.50 / $7.50); it's an env var (`GEMINI_READING_MODEL`), so it can be tried without a deploy.

So search grounding dominates once past the free tier. Prod volume is unknown from the
repo; check the Convex dashboard (function calls on `messenger:handleEvents`) and the
Gemini usage page before a change that adds calls per message.

A message costs about 5–10 small Convex function calls (claim, state query, a few
mutations). Reading docs are a few KB; vectors live in `readingEmbeddings` so they are
never loaded with a reading.

## Reads

- `withIndex` on a bounded range, `.first()` or `.take(n)`. Users by `by_messenger_id`, readings by `by_user` (newest first with `.order("desc")`), payments by `by_external_id`.
- Convex `.filter()` is a full scan of whatever range you gave it, and `q.gte(...) && q.lt(...)` silently keeps only the second condition. Filter in JS on a bounded `.take()` or use `q.and`.
- Count with counters, not scans: `users.readingCount` is kept by `readings:createReading`.
- Queries called from actions return slim objects (`readings:listRecentForUser`, `readings:listByIds`) so actions don't move whole documents around.

## Writes

- Claim before you spend: `webhookEvents:claim` (one per Meta event), `users:beginReading` (one reading per question), `followups:reserveQuestion` (one slot per follow-up, given back by `followups:releaseQuestion` on failure), `payments:markPaid` (paid and upgraded in one transaction).
- Append to arrays inside the mutation (`followups:recordAnswer`), never write back a copy read earlier in an action.
- Never patch a field to `undefined` by accident: in Convex that deletes it. `users:saveProfile` only writes names it actually got.
- A scheduled mutation must not cancel its own scheduled id (Convex 1.50+ throws and rolls back). `users:downgradeToFree` shows the guard to use instead.

## Actions and AI

- Plain async functions called from actions, not `ctx.runAction` hops, except to reach the Node runtime (`imageActions:ensureAttachmentIds`, which uses Jimp).
- **Gemini writes, Jev judges.** Any yes/no, pick-one or how-much decision (routing, emotion, relevance, "is this safe", "does the reading mention cards we didn't draw") is a Jev question in `convex/ai/jev.ts`, not a Gemini JSON prompt: about 200 ms, a fraction of a cent, and real probabilities to threshold. Read the live docs first (https://docs.typesafe.ai/llms.txt) and load the `typesafe-ai` skill.
- **Jev patterns used here:** put several independent questions about the same `state` in one request (`readMessage` asks intent and emotion together); act only above a threshold and fall back to the old behaviour below it (thresholds at the top of `convex/messenger.ts` and `convex/embeddings.ts`); one Noul per candidate for relevance (`rateRelatedReadings`); describe options as concrete situations and name Taglish explicitly, which fixed "pasado ba ako sa board exam" being read as a greeting.
- **Test Jev questions before shipping them.** Run them on 30+ realistic English and Taglish messages straight against `https://api.typesafe.ai/v1/systemone` and look at the probabilities, not just the picks. The current questions scored 44/45. Keep the model pinned (`jev-1.14.0`) and re-test when changing it or a question's wording.
- Every Jev function returns null on failure (no key, timeout, 4xx); 429, 529 and 5xx get one retry. The bot must keep working without Jev.
- All Gemini calls go through `convex/ai/gemini.ts`; one cached client pinned to `v1beta` (SDK 3.x defaults to `v1`). Every call has `httpOptions.timeout` and an explicit thinking level (`thinkingFor`; 3.8 Flash and Gemini 4 have no "minimal").
- Generation throws on failure; emotion returns null; memory returns "". Only the reading itself may block the person.
- Run independent AI work in parallel (`handleQuestion` runs emotion and memory together).
- User text goes into Jev as `state` and into Gemini prompts as data, never as instructions.
- Before changing a Gemini model: check its shutdown date, price and grounding support on Google's pages, and keep the env override (`GEMINI_READING_MODEL`, `GEMINI_FAST_MODEL`) working.

## Messenger and Graph API

- One client: `convex/lib/messenger.ts` (`GRAPH_API_VERSION` = `v26.0`; v23 was supported until 2027-10-08). Bump the version there only, after reading the Graph API changelog.
- `sendText` splits at 2000 characters and never throws. The page token is a query parameter, so never log a Graph URL.
- `messaging_type` is `RESPONSE` for replies and `UPDATE` for proactive sends (daily notice, promo, follow-up window end). Proactive sends must land within 24 hours of `users.lastMessageAt`.
- Card images are uploaded once per card and orientation and cached in `tarotCardImages`. Keep the hand-built multipart body in `convex/imageActions.ts`; it is the format known to work.

## Payments

- Xendit invoices only for free users; `startCheckout` in `convex/payments.ts`. The callback token is compared with `timingSafeEqual`.
- Unhandled money cases are logged, not guessed: a second payment while subscribed, or an amount below the invoice. Those need Gab.

## Schema and migrations

- Widen → migrate → narrow. Legacy fields still in the schema: `readings.embedding` (unused since Nov 2026; clearing it deletes data, so it's Gab's call) and `users.followupSessionsToday`.
- A data migration is an internal action that pages through the table, schedules itself for the next page, is idempotent and has a `dryRun`. Put it in a `migrations.ts` module in `convex/`, show Gab the dry-run numbers, and get a yes before prod: in Nov 2026 Gab chose not to re-embed old readings, so "it's cheap" is not a reason on its own.
- One-off repairs live in `convex/admin.ts` (`admin:findFallbackReadings`, `admin:redoReading`, `admin:deleteReadingEmbeddings`).

## Security

- Every function is internal except `payments:getPaymentByExternalId`, which returns only display fields. Check with `npx convex function-spec` that nothing else is public.
- Webhooks: Messenger POSTs are checked against `FACEBOOK_APP_SECRET` (`verifyMessengerSignature`); Xendit against `XENDIT_CALLBACK_TOKEN`.
- Secrets are env vars (`GEMINI_API_KEY`, `TYPESAFE_API_KEY`, ...), listed by name in `docs/OPERATIONS.md`. Never print values (`npx convex env list` prints names only for agents; don't pass `--include-values`).
- Logs carry no message text, emails or tokens. PSIDs appear in some logs; keep it that way or less.

## Verify

Local only, never a cloud deployment:

```sh
CONVEX_AGENT_MODE=anonymous npx convex dev --tail-logs always   # backend on :3210, HTTP on :3211
npx convex env set FACEBOOK_APP_SECRET test-app-secret            # plus ACCESS_TOKEN, GEMINI_API_KEY etc., fake values
```

Then POST webhook bodies signed with `sha256=` + HMAC-SHA256 of the body (as `signMessengerBody` does) to `http://127.0.0.1:3211/webhook`, and read state with `npx convex run users:getSessionState '{"messengerId":"u1"}'` or `npx convex data <table>`. Fake keys make Facebook and Gemini fail, which exercises the error paths; with a real `GEMINI_API_KEY` you can read real readings in the logs. Internal functions can be called directly with `npx convex run` to set up a state (e.g. `readings:createReading`).

## Shipping

- `npx convex deploy` publishes to the live Page. Gab decides when.
- Before: `bun run check`, and a local run of the flow you changed.
- After: watch the Convex logs for "Messenger send failed", "Reading generation failed" and "FACEBOOK_APP_SECRET is not set", and the Meta webhook page for delivery errors.
