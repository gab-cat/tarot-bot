# Data Model: Follow-Up Questions

## Extended Schema Overview

The follow-up questions feature extends the existing users and readings tables while adding new conversation tracking capabilities.

## Entity: Reading Session (Extended)

**Purpose**: Represents a complete tarot reading session including initial reading and follow-up conversations.

**Fields**:

- `userId`: ID reference to users table
- `messengerId`: String (Facebook Messenger user ID)
- `question`: Optional string (original user question)
- `cards`: Array of card objects (id, name, meaning, position, reversed)
- `interpretation`: String (AI-generated initial interpretation)
- `readingType`: String enum ("daily", "question", "manual")
- `createdAt`: Number (Unix timestamp)
- `sessionState`: String enum ("active", "followup_available", "followup_in_progress", "completed", "ended")
- `subscriptionTier`: String (cached user tier for the session)
- `maxFollowups`: Number (tier-based limit: 1, 3, or 5)
- `followupsUsed`: Number (counter of follow-up questions asked)
- `conversationHistory`: Array of conversation objects (see below)
- `lastActivityAt`: Number (Unix timestamp of last interaction)

**Relationships**:

- One-to-many with FollowupQuestion entities
- Many-to-one with User entity

**Validation Rules**:

- `followupsUsed` ≤ `maxFollowups`
- `sessionState` transitions: active → followup_available → followup_in_progress → completed/ended
- `conversationHistory` maintains chronological order

## Entity: FollowupQuestion (New)

**Purpose**: Individual follow-up questions within a reading session.

**Fields**:

- `readingId`: ID reference to readings table
- `userId`: ID reference to users table
- `messengerId`: String (Facebook Messenger user ID)
- `questionNumber`: Number (1, 2, 3, etc. within session)
- `question`: String (user's follow-up question)
- `response`: String (AI-generated response, 1-4 sentences)
- `responseTime`: Number (milliseconds to generate response)
- `createdAt`: Number (Unix timestamp)
- `isValidQuestion`: Boolean (AI validation of question relevance)

**Relationships**:

- Many-to-one with Reading Session
- Many-to-one with User

**Validation Rules**:

- `question` length ≤ 500 characters
- `response` contains 1-4 sentences
- `responseTime` < 3000ms (3 seconds)

## Entity: User (Extended)

**Purpose**: User profile with subscription information for follow-up limits.

**Additional Fields**:

- `followupSessionsToday`: Number (count of sessions with follow-ups today)
- `lastFollowupAt`: Optional number (timestamp of last follow-up interaction)

**Existing Fields Used**:

- `userType`: String ("free", "mystic", "oracle", "pro", "pro+") - determines followup limits
- `sessionState`: Extended enum to include follow-up states

**Validation Rules**:

- Daily follow-up session limits based on userType
- Session state consistency across follow-up flows

## Conversation History Structure

**Purpose**: Maintains complete conversation context for AI threading.

**Structure** (stored as JSON array in readings.conversationHistory):

```typescript
interface ConversationEntry {
  type:
    | "initial_reading"
    | "followup_question"
    | "followup_response"
    | "session_end";
  timestamp: number;
  content: string;
  questionNumber?: number; // For followups
  responseTime?: number; // For responses
  isValidQuestion?: boolean; // For questions
}
```

**Usage**:

- Initial reading creates first entry
- Each follow-up question adds question + response entries
- Session end adds final entry
- Used to reconstruct conversation for AI context

## State Transitions

### Reading Session States

```
active → followup_available (after initial reading)
followup_available → followup_in_progress (user asks first follow-up)
followup_in_progress → followup_in_progress (additional questions)
followup_in_progress → completed (all questions used)
followup_in_progress → ended (user presses end button)
```

### User Session States (Extended)

```
waiting_question → reading_in_progress → reading_complete → followup_available → followup_in_progress → session_end
```

## Data Integrity Constraints

1. **Follow-up Limits**: Database-level checks prevent exceeding tier limits
2. **Session Consistency**: Session state changes are atomic with data updates
3. **Conversation Ordering**: Conversation history maintains chronological order
4. **Response Validation**: AI responses validated for length and relevance before storage
5. **Performance Monitoring**: Response times tracked for performance analysis

## Migration Strategy

**Backward Compatibility**: Existing readings without follow-up data continue to work normally.

**Schema Extensions**:

- Add new fields to readings table with default values
- Add new FollowupQuestion table
- Update user table with follow-up tracking fields

**Data Migration**:

- Set default sessionState = "completed" for existing readings
- Set default followup limits based on existing userType mappings
- Initialize conversationHistory for new readings only
