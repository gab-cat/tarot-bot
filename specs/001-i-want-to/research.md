# Research: Follow-Up Questions Feature

**Decision**: AI conversation threading using conversation history storage
**Rationale**: Maintains context across follow-up questions while staying within Convex's real-time database constraints. Each reading session stores complete conversation history for AI context.
**Alternatives considered**:

- Stateless AI calls with summary injection (rejected: loses nuanced context)
- External conversation storage (rejected: adds complexity and cost)
- AI memory APIs (rejected: not available in current Gemini setup)

---

**Decision**: Subscription limits enforced at conversation start with remaining question counter
**Rationale**: Clear user expectations, prevents mid-conversation surprises, aligns with existing daily reading limits pattern.
**Alternatives considered**:

- Real-time limit checking (rejected: complex state management)
- Post-conversation billing (rejected: poor user experience)
- Unlimited free tier (rejected: doesn't support business model)

---

**Decision**: Facebook Messenger quick replies for follow-up UI with persistent "End Reading" button
**Rationale**: Maintains conversational flow, matches Messenger UX patterns, ensures users always have exit option.
**Alternatives considered**:

- Text-based commands (rejected: less intuitive)
- Postback buttons only (rejected: loses conversational feel)
- Inline keyboard (rejected: not Messenger standard)

---

**Decision**: Extended session states for follow-up conversations
**Rationale**: Builds on existing session management (waiting_question, reading_in_progress, reading_complete) with new states for follow-up flow.
**Alternatives considered**:

- Separate conversation threads (rejected: overcomplicates user experience)
- Timer-based sessions (rejected: unpredictable for users)
- No session extension (rejected: breaks conversation continuity)

---

**Decision**: Conversation history stored as JSON array in readings table
**Rationale**: Keeps all conversation data with the reading, enables easy retrieval for AI context, maintains data locality.
**Alternatives considered**:

- Separate conversation table (rejected: adds unnecessary joins)
- Redis caching (rejected: increases infrastructure complexity)
- AI-side conversation memory (rejected: not supported by Gemini API)

---

**Decision**: Response length validation (1-4 sentences) with AI prompt engineering
**Rationale**: Ensures consistent, focused responses while maintaining conversational quality through specific prompt instructions.
**Alternatives considered**:

- Post-processing truncation (rejected: may cut off mid-sentence)
- Strict token limits (rejected: unpredictable output length)
- Multi-stage AI calls (rejected: increases latency)

---

**Decision**: Graceful degradation when AI service fails during follow-up
**Rationale**: Maintains user experience continuity, follows existing fallback pattern, prevents conversation interruption.
**Alternatives considered**:

- End conversation immediately (rejected: poor user experience)
- Retry without context (rejected: loses conversation meaning)
- Switch to static responses (rejected: inconsistent with AI-powered experience)

---

**Decision**: Question relevance validation using AI context matching
**Rationale**: Maintains conversation quality and tarot reading integrity by ensuring follow-ups relate to the original reading.
**Alternatives considered**:

- No validation (rejected: allows off-topic conversations)
- Keyword filtering (rejected: too restrictive)
- Manual moderation (rejected: not scalable)
