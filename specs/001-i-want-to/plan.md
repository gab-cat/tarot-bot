# Implementation Plan: Follow-Up Questions

**Branch**: `001-i-want-to` | **Date**: 2025-10-07 | **Spec**: /specs/001-i-want-to/spec.md
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement follow-up question capability after initial tarot readings with subscription-based limits (Free: 1, Pro: 3, Pro+: 5), threaded AI conversations for better context, and conversational responses limited to 1-4 sentences. Reading sessions end when questions are exhausted or user presses "End Reading" button.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Convex (^1.27.4), Google Gemini AI (^1.22.0), Bun runtime
**Storage**: Convex database (real-time, serverless)
**Testing**: Convex built-in testing, manual integration testing
**Target Platform**: Facebook Messenger bot, HTTP API endpoints
**Project Type**: Backend API service with chat bot interface
**Performance Goals**: <2 seconds AI interpretation, <3 seconds total response time, <200ms API calls
**Constraints**: <512MB memory per deployment, stateless except for database persistence
**Scale/Scope**: 1000+ concurrent users, 10,000+ daily readings, single backend service

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Code Quality Compliance

- [x] TypeScript usage confirmed for all backend functions
- [x] Strict type checking enabled in tsconfig.json
- [x] Error handling patterns implemented
- [ ] Code review process established

### Testing Standards Compliance

- [x] Test coverage plan defined (target: 90%+)
- [x] Unit test structure for Convex functions planned
- [x] Integration test strategy for Facebook Messenger API defined
- [x] End-to-end test scenarios identified

### User Experience Consistency

- [x] Response time targets defined (< 3 seconds for 95% of interactions)
- [x] Error message formats established
- [x] Card display consistency requirements documented
- [x] Edge case handling strategy outlined

### Performance Requirements

- [x] Concurrent user capacity defined (1000+ users)
- [x] AI interpretation response time targets set (< 2 seconds)
- [x] Image serving capacity requirements specified (10,000+ req/min)
- [x] Database query performance targets established (< 50ms)

## Project Structure

### Documentation (this feature)

```
specs/001-i-want-to/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
convex/
├── _generated/          # Auto-generated Convex types and API
├── schema.ts            # Database schema (EXTENDED for follow-up sessions)
├── constants.ts         # Bot messages and configuration (EXTENDED for follow-up prompts)
├── users.ts             # User management (EXTENDED for follow-up limits)
├── readings.ts          # Reading management (EXTENDED for follow-up tracking)
├── tarot.ts             # Core tarot logic (EXTENDED for conversational AI)
├── facebookApi.ts       # Facebook Messenger integration (EXTENDED for follow-up UI)
├── http.ts              # HTTP endpoints (EXTENDED for follow-up webhooks)
└── followups.ts         # NEW: Follow-up conversation management
```

**Structure Decision**: Single backend service extending existing Convex architecture. Follow-up questions feature integrates seamlessly with current users/readings/session management while adding new followups.ts module for conversation threading and subscription limit enforcement.

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
