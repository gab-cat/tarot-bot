# Tasks: Follow-Up Questions

**Input**: Design documents from `/specs/001-i-want-to/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Extend database schema in convex/schema.ts for follow-up conversation fields
- [x] T002 Add subscription tier constants in convex/constants.ts for follow-up limits
- [x] T003 Create new followups.ts file with basic module structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Extend readings table schema with sessionState, maxFollowups, followupsUsed, conversationHistory, lastActivityAt fields
- [x] T005 [P] Extend users table schema with followupSessionsToday, lastFollowupAt fields
- [x] T006 Add subscription limit constants for Free(1), Pro(3), Pro+(5) follow-ups
- [x] T007 Create basic follow-up session management functions in convex/followups.ts
- [x] T008 Add conversation history data structure and validation functions

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Ask Follow-Up Questions (Priority: P1) 🎯 MVP

**Goal**: Enable users to ask follow-up questions after initial readings with conversational AI responses

**Independent Test**: Can be fully tested by sending a follow-up question after an initial reading and receiving a conversational response with an end reading option

### Implementation for User Story 1

- [x] T009 [US1] Implement startFollowupSession action in convex/followups.ts to transition reading to followup_available state
- [x] T010 [US1] Implement askFollowupQuestion action in convex/followups.ts to process questions and generate AI responses
- [x] T011 [US1] Implement endFollowupSession action in convex/followups.ts to close conversation gracefully
- [x] T012 [US1] Extend convex/tarot.ts with generateFollowupResponse function for 1-4 sentence conversational replies
- [x] T013 [US1] Update convex/http.ts webhook handler to detect follow-up question messages
- [x] T014 [US1] Extend convex/facebookApi.ts with sendFollowupResponse function for quick reply UI
- [x] T015 [US1] Add conversation history tracking to reading sessions in convex/readings.ts
- [x] T016 [US1] Update convex/users.ts to track follow-up session activity and question counts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Subscription-Based Question Limits (Priority: P2)

**Goal**: Enforce different follow-up question limits based on user subscription tiers

**Independent Test**: Can be fully tested by verifying that users see appropriate question counters and upgrade prompts based on their subscription level

### Implementation for User Story 2

- [x] T017 [US2] Add subscription tier validation to askFollowupQuestion function in convex/followups.ts
- [x] T018 [US2] Implement question counter decrement logic in convex/followups.ts
- [x] T019 [US2] Add upgrade prompt generation for exhausted free tier users in convex/constants.ts
- [x] T020 [US2] Update sendFollowupResponse in convex/facebookApi.ts to show remaining question count
- [x] T021 [US2] Add subscription limit checking to webhook handler in convex/http.ts
- [x] T022 [US2] Extend user profile queries in convex/users.ts to include follow-up usage tracking

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Threaded AI Context (Priority: P3)

**Goal**: Maintain AI context from initial reading throughout follow-up conversation for coherent responses

**Independent Test**: Can be fully tested by comparing follow-up responses to ensure they reference the original cards and interpretation appropriately

### Implementation for User Story 3

- [x] T023 [US3] Enhance generateFollowupResponse in convex/tarot.ts to use conversation history for context
- [x] T024 [US3] Add conversation history retrieval to askFollowupQuestion in convex/followups.ts
- [x] T025 [US3] Implement conversation thread validation to ensure relevance to original reading
- [x] T026 [US3] Add AI context window management for long conversations in convex/tarot.ts
- [x] T027 [US3] Update conversation history storage to maintain chronological order in convex/followups.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T028 Update convex/constants.ts with final follow-up UI messages and prompts
- [ ] T029 Add conversation state recovery for interrupted sessions in convex/followups.ts
- [x] T030 Implement graceful AI fallback responses when service fails during follow-ups
- [x] T031 Add performance monitoring for follow-up response times in convex/tarot.ts
- [x] T032 Update error handling across all follow-up functions for consistent user experience
- [ ] T033 Add conversation analytics tracking for engagement metrics

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all implementation tasks for User Story 1 together:
Task: "Implement startFollowupSession action in convex/followups.ts to transition reading to followup_available state"
Task: "Implement askFollowupQuestion action in convex/followups.ts to process questions and generate AI responses"
Task: "Implement endFollowupSession action in convex/followups.ts to close conversation gracefully"

# Launch UI and integration tasks together:
Task: "Update convex/http.ts webhook handler to detect follow-up question messages"
Task: "Extend convex/facebookApi.ts with sendFollowupResponse function for quick reply UI"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
