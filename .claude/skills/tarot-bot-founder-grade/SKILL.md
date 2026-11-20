---
name: tarot-bot-founder-grade
description: >-
  Tarot Bot edition of Gab's founder-grade standard: finding the real reason behind
  every ask and fixing causes, reading every relevant line, building end to end,
  polish for both the Messenger conversation and the small web site under Gab's
  anti-slop rules, the cheap fast Convex and Gemini patterns this repo has learned,
  researching when unsure, and expanding the ask when it makes the product better.
  Use it when you judge a task in this repo would benefit (a new feature, a bug, a
  change to what the bot says, the reading prompt or AI models, payments or plan
  limits, the webhook, a costly or critical Convex path, the landing or payment
  pages), or when the user asks for it: founder-grade, enterprise-level, polish this,
  make it the best version, /tarot-bot-founder-grade.
  For UI or UX work (a screen, flow, layout, copy on a screen or in a bot message, a
  redesign, or a creative ask such as "be creative" or "find inspo"), also load
  founder-design.
---

# Founder-grade in Tarot Bot

The same standard as the general `founder-grade` skill (in `~/.claude/skills/` when
it's installed), written so it stands on its own in this repo, plus what Tarot Bot has
already taught us. In this repo, this file wins where the two differ.
Based on founder-grade (2026-11-17). To refresh it, follow the general skill's
`customize.md`.

Ship work you would put your own name and money behind. Gab trusts you as a thought
partner with real authority. Real people message the live Facebook Page, often when
they are anxious about love, work or family, and some of them pay. A wrong limit, a
duplicate charge or a silent failure lands on a person in a chat window. The bar is a
product that feels finished: the small details nobody notices until they are missing.

## UI and UX work: load founder-design too

When the concern is a screen, dialog, flow, layout, empty or error state, on-screen
copy, a bot message, a redesign or a creative ask ("be creative", "make it special",
"find inspo"), also load the global `founder-design` skill with the Skill tool (in
`~/.claude/skills/founder-design/`) and follow its loop: real Before screenshots,
research (best practices and evidence for usability asks, real-world inspiration and
distinct directions for creative ones), mock-ups of every state on a temporary dev
page, a proposal with Before and After, then the build once Gab picks. In this repo
the main "screen" is the Messenger conversation; see [ui.md](ui.md). This edition stays
in charge of how it gets built; founder-design decides what it should be.

## The five commitments

1. **Find the real reason.** Solve the problem behind the ask, not just the words of it.
2. **Understand before you touch.** Read every line the change depends on.
3. **Build end to end.** Schema, Convex functions, the Messenger flow and its copy, the site when it's involved, every failure path, tests, docs and a real run on a local deployment. Nothing half-wired.
4. **Polish to the last pixel and the last millisecond.** Conversation and site per [ui.md](ui.md). Backend per [backend.md](backend.md).
5. **Own the outcome.** Expand the ask when it makes the result better, solve the problems you find on the way, then say what you did.

## 1. Find the real reason

The ask is what Gab noticed. Your job is the reason behind it. This is the higher level
of thinking Gab expects on every task, big or small.

- **Name the goal in one line**: what should be true for the person messaging the Page when you're done. The literal request is a clue, not the ceiling.
- **Ask why until you reach the cause.** For a bug: what exactly happens, for whom, since when, what changed, why it happens, and why nothing caught it. For a request: what problem made them ask, who else has it, and what they'll try next. Write the chain down in a line or two before you build.
- **Prove the cause, don't guess it.** Evidence lives in the Convex dashboard logs (every failure logs a plain message, e.g. "Reading generation failed", "Messenger send failed"), the Meta App Dashboard webhook page, the Xendit callback log, `git log -p` on the file, and a reproduction on a local anonymous deployment (see [backend.md](backend.md#verify)). A fix for a guessed cause is a second bug.
- **Fix the cause, then the class.** Patch the root, not the spot where it showed. Then look for the same mistake elsewhere and fix those too, or list them. Example from this repo: long readings were "fixed" in Dec 2025 by splitting messages, but the cause was a prompt that said "under 2000 words" (not characters) and asked for `**markdown**` that Messenger can't render. Another: one `.filter()` with `&&` turned out to be four, one of which let a future-dated promo unlock readings immediately.
- **Check the fix answers the reason, not just the words.** If doing exactly what was asked wouldn't solve the real problem, say so, solve the real one, and explain the difference.
- **Be proactive, even unprompted.** When you notice something wrong while working (a wrong count, a promise in copy the code doesn't keep, a silent failure, a public function, a model nearing shutdown), dig into it the same way. Fix it when it's safe and outside the ask-first list below; otherwise report it with the cause and the fix you'd make. Never walk past it.
- **Think one step ahead.** What happens when Meta delivers the same event twice, or out of order? When Gemini times out mid-reading? When a user taps an old quick reply a day later? When the model in `convex/ai/models.ts` is deprecated? Handle the cheap ones now and name the rest.

## 2. Understand before you touch

- **Read the rules first**: [CLAUDE.md](../../../CLAUDE.md), [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md), [docs/OPERATIONS.md](../../../docs/OPERATIONS.md). Ignore `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc` where it says to drop Vite. `specs/` and `.cursor/plans/` are history.
- **Read the real code paths**: for any message-driven change, `handleEvent` in `convex/messenger.ts` top to bottom (the order of the checks is behaviour), then the internal functions it calls in `convex/users.ts`, `convex/readings.ts`, `convex/followups.ts`, `convex/payments.ts`. Whole functions, not grep hits.
- **Business rules live in `convex/constants.ts`**: `PRICES_PHP`, `FOLLOWUP_LIMITS`, `MYSTIC_READINGS_PER_DAY`, `SUBSCRIPTION_DAYS`, plus every message the bot sends. Prices, limits and anything the copy promises are Gab's to change.
- **Find the existing pattern** before inventing one: `sendText` for every outgoing message, `findUser` for user lookups, `toBoldFont` and `formatForMessenger` for emphasis, the validators in `convex/validators.ts`, the Gemini functions in `convex/ai/gemini.ts`. A second way of doing the same thing is a cost.
- **Map the blast radius**: a change to the user or reading shape touches the webhook flow, the scheduled jobs (notifications, follow-up end, downgrade, promos), the migrations and the success page's one public query.
- **Research when unsure**: Convex docs (docs.convex.dev, and the changelog for behaviour changes; 1.50 made self-cancelling scheduled mutations throw), the Gemini docs (aistudio.google.com/docs, especially deprecations and pricing), the Messenger Platform docs and Graph API changelog, Xendit's invoice docs. Say in your report what you learned and why you chose it.

## 3. Build end to end

A change is done when a real person can use it in Messenger start to finish and recover from every failure:

- **Data**: validators from `convex/validators.ts`, an index for every query path, widen → migrate → narrow, and a batched, resumable, dry-runnable migration in `convex/migrations.ts` for rows that already exist.
- **Server**: new functions are `internal*`. Identity is the webhook sender id, never an argument from a client. Anything that spends money or tokens is idempotent (claim first, like `users:beginReading`, `followups:reserveQuestion`, `payments:markPaid`). The webhook only schedules.
- **Conversation**: every state in [ui.md](ui.md#every-state-of-the-conversation), a reply for every input in every state, failures that tell the person what happened and give back what they didn't get.
- **Copy**: in `convex/constants.ts`, in the bot's existing voice, quick reply titles within 20 characters.
- **Wiring**: quick reply payloads handled in `handleEvent` or `handleFollowup`, scheduled jobs registered, `docs/ARCHITECTURE.md` and `docs/OPERATIONS.md` updated, new env vars listed in `docs/OPERATIONS.md`.
- **Proof**: unit tests in `tests/` for pure logic, `bun run check` clean, and a real run on a local anonymous deployment with signed webhook posts (see [backend.md](backend.md#verify)).

## 4. Own the outcome

- **You have authority to go past the ask.** Fix the adjacent bug, handle the input nobody handled, make the next step one tap, cut the needless AI call, tighten the copy you touched. When you change one reply in a flow, read the whole flow it sits in.
- **Expand toward the goal, not sideways.** Extras make the asked-for thing better or complete. A new, unrelated feature is a proposal in your report, not a surprise in the diff. Problems are different: problems you find get solved (or reported with their cause); features you think of get proposed.
- **Always say what you added** beyond the ask and why, as a short list.
- **Ask first only when the call is really Gab's**: `npx convex deploy` (prod is the live Page), prod env vars, running a migration or a promo on prod, anything that sends messages to real users, prices, plan limits, refunds and anything a paid user was promised, the reading persona and voice, the daily reset time, model changes that cost noticeably more. Ask one clear question with your recommendation, and keep working on everything that doesn't depend on the answer.

## Client ledger

Tarot Bot is Gab's own product, so it has no client in the ledger
(`python3 -I ~/.claude/skills/founder-grade/scripts/client_ledger.py which` prints nothing
for this repo). Gab's decisions go to memory. If Gab ever says a message is from a
partner or client on this project, create the client first
(`client_ledger.py new-client <slug> --name "…" --project ~/Documents/github/tarot-bot`),
log what the message shows, and add their brief to this section. The ledger content
itself never goes in this repo. The how-to is `~/.claude/skills/founder-grade/client-ledger.md`.

## Done gate

Check every line before you say done:

- [ ] You found and proved the real cause or need, fixed it at the root, and checked for the same problem elsewhere.
- [ ] It works for a real person in Messenger start to finish, including a first-time user, a duplicate delivery, a Gemini failure and a tap on an old quick reply.
- [ ] Every conversation state from [ui.md](ui.md) has a reply, and site changes handle every state there too.
- [ ] Gab's UI rules hold on the site, and the bot's copy keeps its voice with titles within 20 characters.
- [ ] Every async step the person waits on is acknowledged first ("Whispering to the cards...") and ends in a result or a plain error with a way forward.
- [ ] Reads are indexed and bounded, no AI call or Graph call is wasted, and the cost per reading is estimated (see [backend.md](backend.md)).
- [ ] Every new Convex function is internal unless there's a stated reason; secrets stay in env vars.
- [ ] Existing rows still validate, and any data change is batched, resumable and dry-run first.
- [ ] `bun run check` is clean (typecheck, lint, tests, prettier). It was clean on `main` as of Nov 2026.
- [ ] You ran it for real on a local anonymous deployment with signed webhook posts.
- [ ] For any change to the site, Before and After screenshots are attached to the report.
- [ ] `docs/ARCHITECTURE.md`, `docs/OPERATIONS.md` and `CLAUDE.md` are updated where your change made them stale.
- [ ] You re-read your diff line by line as a strict reviewer and removed debug code, dead code and stray edits.

## Report

Lead with what the user can do now. For a site change, show the Before and After screenshots next. Then the real cause you found and the evidence, in a line or two. Then list what you added beyond the ask, other problems you found and what you did about each, what you verified and how, what you chose not to do and why, and any open question. Plain words, no hype. If something failed or wasn't verified, say so.
