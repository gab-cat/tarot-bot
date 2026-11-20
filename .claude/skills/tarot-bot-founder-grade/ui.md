# UI in Tarot Bot

Two surfaces. The product is the **Messenger conversation**. The **site** (`src/`) is a
landing page plus the payment success page that Xendit redirects to.

## Gab's rules (never traded away)

These apply to the site, and their spirit (plain words, no filler, feedback for every
action) applies to the bot too.

- Sentence case. No all-caps labels, no letter-spaced uppercase.
- No eyebrows above headings. Lead with the heading.
- Cards are slightly rounded (6–8px), never pill-shaped. No shadows on cards; separate with a 1px border or a background tint.
- No AI glyphs (sparkles, stars, wands, ✨, ✳). Icons name the actual thing, or no icon.
- No icon tiles (an icon on a small tinted or filled square). Show something real: faces, a count, an illustration in the page's style, or just the heading.
- Text is `text-foreground`. Muted only where grey carries meaning (a timestamp, placeholders, disabled).
- Copy follows the anti-slop approach: no filler, plain specific words, no hype, no em-dash flourishes.
- Every interaction gives feedback: hover, press, focus, pending state for every async action, then success or error.
- Content enters with a short animation; lists and grids stagger. Respect `prefers-reduced-motion`.
- Skeletons only for dynamic data, mirroring the real layout. Static parts render as real content immediately.

The bot's existing voice (mystical, warm, emoji-led, ✨ included) is Gab's product
voice and predates these rules. Keep it in bot messages unless Gab asks to change it;
apply the rules fully to new site work.

## The conversation

What a person sees is a sequence of Messenger messages with quick reply buttons.

- **Every message text lives in `convex/constants.ts`.** Persona and reading format live in `convex/ai/prompts.ts`.
- **Bold is Unicode** (`toBoldFont`). Messenger shows no Markdown. The model writes `**bold**` and `formatForMessenger` converts it. Unicode bold is read badly by screen readers, so use it for short labels, not whole sentences.
- **Messages over 2000 characters are rejected by Messenger.** `sendText` splits them; prompts aim for 1800 so a reading is one message.
- **Quick reply titles over 20 characters get cut** ("Mystic Guide (₱49) - 5 daily readings" showed as "Mystic Guide (₱49) -" until Nov 2026). Put details in the message, keep titles short. `tests/constants.test.ts` checks every title.
- **Quick replies are read by payload.** A title can change freely; a payload is an API between the button and `handleEvent`, and old buttons stay tappable in the chat history forever. Keep old payloads working.
- **Acknowledge before slow work.** A reading takes 20–60 seconds; "Whispering to the cards..." goes out first.
- **Failures give something back.** A failed reading keeps the day's reading and offers "🔄 Try again" with the same question as payload. A failed follow-up returns the question slot.

### Every state of the conversation

| Situation | What good looks like |
|---|---|
| First contact (Get Started) | Named welcome when the profile lookup works, plain welcome when it doesn't. Start, Quick Question, About Me. |
| No session, a typed question | Jev reads it (p ≥ 0.8) and the reading starts, or the birthdate is asked first. |
| No session, anything else typed | Jev routes start, profile, upgrade or greeting (p ≥ 0.6); otherwise keyword checks, then a clear next step (Start). Never silence. |
| Waiting for birthdate | Accepts "Oct 15", "October 15th", "15/10", "Oktubre 15". "Why?" gets a reason. A question typed here is held and read once the birthdate arrives. |
| Waiting for the question | Topic buttons, or free text. "ok", "hi" or "start" re-asks instead of spending the reading. |
| Reading in progress | "Still reading your cards..." for anything sent; the reading itself runs once. After 5 minutes the lock lifts by itself. |
| Daily limit reached | Time until the reset, and upgrade buttons for free users only. |
| Follow-up window open | Questions answered in the reading's voice; remaining-question buttons; "Start" or "cancel" leaves cleanly. "Thanks" / "salamat po" gets "You're welcome" without using a question; "draw new cards" starts over. |
| Follow-up limit reached | Says so; upgrade buttons only for free users (paid users can't buy a higher plan yet). |
| Paid user taps an upgrade button | Their plan and expiry, not a checkout. |
| Gemini, Graph or Xendit down | Plain error, nothing used up, a way to retry. |
| Duplicate or late webhook delivery | No second reply. |

## The site

- **Look**: dark, violet-led landing page built from React Bits and Aceternity pieces (`src/components/CardNav.jsx`, `src/components/CardSwap.jsx`, `src/components/MagicBento.jsx`, `src/components/ui/background-beams.tsx`, `src/components/ui/sticky-scroll-reveal.tsx`) with GSAP and `motion`. Tailwind 4 tokens in `src/App.css` and `src/index.css`; shadcn "new-york" components in `src/components/ui/` (`components.json`).
- **Payment success page**: `src/components/SuccessPage.tsx`, loaded lazily with its Convex client from `src/SuccessRoute.tsx` so the landing page doesn't ship the Convex client. It reads `payments:getPaymentByExternalId`.
- **Routes**: `src/main.tsx` (`/` and `/xendit/success`). Vercel rewrites everything to `index.html` (`vercel.json`).
- **Known gaps (Nov 2026)**: the success page shows "Payment Not Found" while the payment is still `PENDING`, which is normal for a few seconds after paying because Xendit's callback can arrive after the redirect. There is no `/xendit/failure` route, so a failed payment lands on a blank page. The success page uses `Sparkles` and `Star` icons, and the shadcn `Card` in `src/components/ui/card.tsx` is `rounded-xl` with `shadow-sm`; both break Gab's rules. These need the founder-design loop before building.

## Verify

- Bot: run a local anonymous deployment and post signed webhook events (see [backend.md](backend.md#verify)). Read every message the flow would send in the logs, in order, as the person would.
- Site: `bun run dev`, then look at `/` and `/xendit/success?external_id=<id>` at 360, 768 and 1280 wide, with a paid, pending and missing payment.
- Screenshot the page before you edit and again after, same page, data and viewport, and attach both to the report as Before and After.
