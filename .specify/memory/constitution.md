<!--
Sync Impact Report:
Version change: old → new: N/A → 1.0.0
List of modified principles: N/A (new constitution)
Added sections: Core Principles (Code Quality, Testing Standards, User Experience Consistency, Performance Requirements), Development Standards, Security & Compliance
Removed sections: N/A
Templates requiring updates: plan-template.md (constitution check section), spec-template.md (no updates needed), tasks-template.md (no updates needed)
Follow-up TODOs: None
-->

# Tarot Bot Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

All code must maintain high standards of readability, maintainability, and reliability. TypeScript must be used for all backend functions with strict type checking enabled. Code must follow consistent naming conventions, include comprehensive error handling, and avoid technical debt accumulation. All functions must have clear, single responsibilities with meaningful documentation. Code reviews are mandatory for all changes, with automated linting and formatting enforced via pre-commit hooks.

### II. Testing Standards (NON-NEGOTIABLE)

Comprehensive test coverage is required for all critical paths. Unit tests must cover Convex functions, mutations, and queries with 90%+ code coverage target. Integration tests must validate Facebook Messenger API interactions, AI interpretation flows, and database operations. End-to-end tests must verify complete user journeys from Messenger message to tarot reading response. Tests must run automatically on all deployments and block releases if they fail.

### III. User Experience Consistency (NON-NEGOTIABLE)

The Messenger bot must provide consistent, intuitive interactions that feel magical yet professional. All responses must follow the established format with card reveals, interpretations, and reading summaries. Error messages must be user-friendly and actionable. Response times must remain under 3 seconds for 95% of interactions. The bot must handle edge cases gracefully without exposing technical details to users. Card images must load reliably and display consistently across all Messenger clients.

### IV. Performance Requirements (NON-NEGOTIABLE)

System must handle 1000+ concurrent users with sub-200ms API response times. AI interpretation requests must complete within 2 seconds. Image serving must support 10,000+ requests per minute. Database queries must maintain sub-50ms response times. Memory usage must stay under 512MB per deployment. The system must scale horizontally without service degradation during peak usage periods.

## Development Standards

### Code Organization

Convex functions must be logically grouped by domain (users, readings, tarot, facebookApi). Database schema must remain normalized and backward-compatible. Environment variables must be validated at startup. All external API calls must include proper error handling and retry logic. Code must be written for maintainability over premature optimization.

### Security Requirements

All user data must be encrypted at rest and in transit. Facebook webhooks must validate signatures to prevent unauthorized access. API keys must never be logged or exposed in error messages. User sessions must timeout appropriately. Rate limiting must prevent abuse while allowing legitimate usage patterns.

### AI Integration Standards

Gemini AI responses must be validated for appropriateness and relevance before user delivery. Fallback responses must exist for AI service failures. AI-generated content must maintain the mystical yet professional tone. Interpretation quality must be monitored and improved through user feedback analysis.

## Governance

Constitution supersedes all other development practices and project documentation. All code changes must demonstrate compliance with these principles. Amendments require consensus agreement and must include migration plans for existing code. Performance regressions are unacceptable and must be addressed immediately. User experience issues take priority over feature development. Regular constitution reviews occur quarterly to ensure continued relevance.

**Version**: 1.0.0 | **Ratified**: 2025-10-07 | **Last Amended**: 2025-10-07
