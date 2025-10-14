<!-- e46c40b9-6802-47d0-8f41-ebfb233a2f30 a6fbb9df-4a52-42fe-b864-5fe0f7b35195 -->
# Reading Memory + Emotional Analysis (RAG on Convex)

## Scope

Implement two features:

- Reading Memory: Retrieve a user’s most relevant past readings via RAG to ground new interpretations.
- Emotional Analysis: Detect emotion from user questions using gemini-2.5-flash-lite and adapt tone.
- Modularize AI code into dedicated agent files for maintainability.

## Data & Schema

- Update `convex/schema.ts`:
- Add `readings.embedding: v.array(v.float64())` and vector index `vectorIndex('by_embedding', { vectorField: 'embedding', dimensions: 768 })` (adjust to model dims).
- Add `readings.emotionLabel: v.optional(v.string())`, `readings.emotionScores: v.optional(v.object({ ... }))`.
- Add `users.lastEmotionLabel: v.optional(v.string())`, `users.lastEmotionAt: v.optional(v.number())`.
- Optional: create `readingEmbeddings` table to decouple vectors if needed later.

## Embeddings & RAG Modules

- New file `convex/embeddings.ts`:
- action `computeReadingEmbedding({ text })`: uses Gemini embeddings model (e.g., `text-embedding-004`) to produce float array.
- helper `retrieveSimilarReadings({ userId, vector, limit, timeDecay? })` using `db.vectorSearch('readings','by_embedding', { vector, limit })`, then filter/boost by `userId`, recency.
- New file `convex/rag.ts`:
- function `buildReadingMemoryContext({ userId, currentQuestion, k })`:
- compute embedding for question (or question + card names if present).
- vectorSearch top-k user readings; fallback to global when sparse.
- return compact snippets (date, spread, cards, 1–2 lines), capped length.

## Emotional Analysis

- New file `convex/ai/emotionalAnalysis.ts`:
- action `analyzeEmotion({ text })` using `gemini-2.5-flash-lite` with strict JSON output:
- `{ label: 'anxious'|'sad'|'neutral'|'hopeful'|'angry'|'confused', scores: Record<string, number>, rationale: string }`.
- Persist to reading (if available) and mirror to user (`lastEmotionLabel`, `lastEmotionAt`).
- Export `toneGuidelines(label)` mapping emotion → tone instructions.

## Modular AI Agents (Refactor)

- Create `convex/ai/` directory with modular agents:
- `convex/ai/interpretationModel.ts`
- Interface `InterpretationModel` with `generateInterpretation({ prompt, cards, user, memoryContext, emotionTone })`.
- Default implementation using Gemini Pro (or current model) and the existing system prompt from `constants.ts`.
- `convex/ai/emotionalAnalysis.ts`
- Interface `EmotionAnalyzer` with `analyze({ text })` returning normalized label/scores.
- Default implementation calling `gemini-2.5-flash-lite`.
- `convex/ai/factory.ts`
- Expose `getInterpretationModel()` and `getEmotionAnalyzer()` reading env for model selection.
- Refactor call sites to use these agents instead of directly importing `@google/genai` in multiple places.
- `convex/tarot.ts`: replace inline model creation with `getInterpretationModel()`; accept `memoryContext` and `emotionTone` parameters.
- Follow-ups path uses same `InterpretationModel` for consistent tone.

## Flow Integration (convex/http.ts)

- On primary message before drawing cards:
1) `emotion = analyzeEmotion(messageText)`; store on user.
2) `memoryContext = buildReadingMemoryContext({ userId, currentQuestion: messageText, k: 3 })`.
3) Draw cards, then call interpretation model with `{ emotionTone: toneGuidelines(emotion.label), memoryContext }`.
- On follow-ups (`processFollowupQuestion`):
- Re-run `analyzeEmotion()` and pass tone + memoryContext to `generateFollowupResponse()`.

## Tarot AI Prompting

- Update `convex/tarot.ts` to thread in optional:
- `opts?: { emotion?: EmotionResult, memoryContext?: string }`.
- Inject `memoryContext` as a separate, clearly-labeled RAG section; keep concise.
- Apply `toneGuidelines` to system prompt to adjust style without changing structure/length limits.

## Write Paths

- After interpretation creation (`convex/readings.ts#createReading` flow):
- Compute embeddings from the final interpretation (or a summary) via `computeReadingEmbedding`.
- Store vector under `readings.embedding` for retrieval.

## Operational Concerns

- Backoff/retries around Gemini calls; log and gracefully degrade (skip RAG, default to neutral tone).
- Privacy: store only normalized scores; easy opt-out flag in future.
- Cost/perf: use `gemini-2.5-flash-lite` for emotion; embeddings batched if adding bulk history.

## Testing

- Unit tests:
- Emotion parsing → label mapping → tone.
- RAG retrieval ranking using mocked vectors.
- Integration smoke:
- Seed 3 historical readings; verify memory context injection and toned responses.

## Files to Change / Add

- Change:
- `convex/schema.ts`
- `convex/http.ts`
- `convex/tarot.ts`
- `convex/readings.ts`
- Add:
- `convex/embeddings.ts`
- `convex/rag.ts`
- `convex/ai/interpretationModel.ts`
- `convex/ai/emotionalAnalysis.ts`
- `convex/ai/factory.ts`

## References

- Convex vector search: define a vector index on a vector field and query with `db.vectorSearch(table, indexName, { vector, limit })`.
- Gemini models:
- Embeddings: `text-embedding-004`
- Low-latency analysis: `gemini-2.5-flash-lite`

### To-dos

- [ ] Extend schema with embeddings, vector index, and emotion fields
- [ ] Create embeddings action and vector retrieval helpers
- [ ] Implement reading memory builder using vectorSearch
- [ ] Implement emotionalAnalysis with gemini-2.5-flash-lite and tone map
- [ ] Introduce ai agents: interpretationModel, emotionalAnalysis, factory
- [ ] Wire emotion + memory into webhook message and follow-up flows
- [ ] Enhance prompts to use emotion tone and memory context
- [ ] Store embeddings on reading creation
- [ ] Add unit tests for emotion parsing and RAG retrieval