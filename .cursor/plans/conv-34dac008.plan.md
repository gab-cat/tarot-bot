<!-- 34dac008-e190-46d4-80da-8f30cc7ae697 7452d63f-83a1-4c9d-bfe9-bf0710d7c705 -->
# Convex Agents + Gemini (Google AI) Integration Plan

## Scope

Set up a Convex Agent that uses Google Gemini via the AI SDK, persists messages/threads in Convex, ties threads to existing `users` records (e.g., Messenger PSID), supports async response generation, and exposes simple server/client hooks. Based on Convex Agent Usage best practices ([Convex Agents – Agent Usage](https://docs.convex.dev/agents/agent-usage)).

## Dependencies

- Add runtime deps with Bun:
- `@convex-dev/agent`
- `ai`
- `@ai-sdk/google`
- Ensure Convex already installed.

## Environment

- Add to `.env` (or environment variables in deployment):
- `GOOGLE_GENERATIVE_AI_API_KEY=`
- Confirm Convex URL/auth config as needed.

## Data Model & Generated Code

- Ensure the Convex Agent component is enabled (uses `components.agent`). If missing types, run codegen after schema changes.
- No new tables if using Agent component’s built-ins; otherwise, add `threads`, `messages` per Convex component expectations.

## Server Files (Convex)

1) Create `convex/agents/gemini.ts` — Agent definition

- Use Google provider: `import { google } from "@ai-sdk/google"`.
- Export a singleton Agent using `components.agent`:
- `name: "Tarot Gemini Agent"`
- `languageModel: google("gemini-1.5-pro")` (switchable to `gemini-2.0-flash` for fast mode)
- `textEmbeddingModel: google.textEmbedding("text-embedding-004")` (for RAG on threads)
- `stopWhen: stepCountIs(5)`
- `tools`: wrap selected domain functions (see below)

2) Create `convex/agents/auth.ts` — authorization helpers

- `authorizeThreadAccess(ctx, threadId, userId)` ensures the thread belongs to the current app user (PSID/your `users` table mapping).
- Map from auth context to your `users` row, e.g., Messenger PSID in `convex/users.ts`.

3) Create `convex/agents/messages.ts` — send and generate

- `sendMessage` mutation: saves user prompt via `saveMessage(ctx, components.agent, { threadId, prompt })`, then schedules async generation.
- `generateResponseAsync` internal action: `agent.asTextAction()` or explicit `agent.generateText(ctx, { threadId }, { promptMessageId })`.
- Optionally add a `startThread` mutation to create a new thread for a given `userId` and return `threadId`.

4) Create `convex/agents/tools.ts` — domain tools

- Use `createTool` to wrap domain actions/queries:
- Tarot reading: call into `convex/readings.ts` (e.g., draw cards, interpret spread)
- Promotions: call into `convex/promotions.ts` (e.g., list current offers)
- Users: fetch persona/name via `convex/users.ts`
- Ensure handlers annotate return types and validate args with `zod`.

5) Optional `convex/agents/usage.ts` — usage tracking

- Provide `usageHandler` and `rawResponseHandler` to log model usage & responses (persist in your tables or log).

6) Optional `convex/agents/threads.ts`

- Lightweight helpers to list threads for a user, archive/rename, and fetch messages (wrapping component queries if you want stable APIs).

## Client Integration (React/Vite)

1) Create `src/agent/useAgentThread.ts`

- Thin wrapper around the Convex React hooks to:
- Create/fetch a thread for the signed-in user
- Send messages via the Convex `sendMessage` mutation
- Read messages via `useThreadMessages` (from Agent component)

2) Create `src/components/AgentChat.tsx`

- Minimal chat UI (compact, sleek, hierarchy-focused; avoid KV-style key:value).
- Input box with submit; scrolling message list; agent/user bubbles.
- No dev server runs required.

3) Wire into an existing page (e.g., `src/App.tsx` or `src/components/SuccessPage.tsx`) with a guarded mount.

## Tooling Choices

- Default model: `gemini-1.5-pro`.
- For low-latency ops: allow switching to `gemini-2.0-flash` by passing `languageModel` override at call site.
- `maxSteps/stopWhen` to enable tool-calling autonomy.
- Use `toolChoice: "auto"` (default) unless requiring a specific tool.

## Security & Auth

- Threads are always associated to your `users` rows (PSID mapping).
- `authorizeThreadAccess` checks on every send/list call.
- Validate tool inputs with `zod` and harden redirects/external calls.

## Testing

- Unit test `authorizeThreadAccess` and tool handlers.
- Integration test: create thread → send prompt → ensure messages appended and tool calls resolve.

## Minimal Snippets (illustrative)

- Server usage (synchronous flow variant):
- `agent.generateText(ctx, { threadId }, { prompt })` producing `result.text` (prefer async pipeline in production).
- Async pattern (preferred):
- `saveMessage` + `scheduler.runAfter(0, internal.agents.generateResponseAsync, { threadId, promptMessageId })`

## References

- Convex Agent Usage: https://docs.convex.dev/agents/agent-usage

### To-dos

- [ ] Add deps: @convex-dev/agent, ai, @ai-sdk/google (via Bun)
- [ ] Add GOOGLE_GENERATIVE_AI_API_KEY to environment
- [ ] Create convex/agents/gemini.ts agent with Google model
- [ ] Create convex/agents/auth.ts authorizeThreadAccess
- [ ] Create sendMessage mutation and async generate action
- [ ] Wrap tarot/promotions/users as Convex Agent tools
- [ ] Add helper queries to list threads/messages for a user
- [ ] Create React hook useAgentThread to send/list messages
- [ ] Add compact AgentChat component and mount in app
- [ ] Add usage and raw response handlers (optional)
- [ ] Add unit/integration tests for auth, tools, async flow