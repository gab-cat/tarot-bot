# Quick Start: Follow-Up Questions Feature

## Overview

The Follow-Up Questions feature allows users to ask deeper questions about their tarot readings, creating an interactive conversation experience. This guide covers implementation and testing of the feature.

## Prerequisites

- Tarot Bot v1.0+ deployed
- Facebook Messenger integration configured
- Google Gemini AI API key configured
- User subscription system active

## Implementation Steps

### 1. Database Schema Updates

Update `convex/schema.ts` to include follow-up fields:

```typescript
readings: defineTable({
  // ... existing fields
  sessionState: v.string(), // "active", "followup_available", "followup_in_progress", "completed", "ended"
  subscriptionTier: v.string(), // "free", "mystic", "oracle", "pro", "pro+"
  maxFollowups: v.number(), // 1, 3, or 5
  followupsUsed: v.number(), // counter
  conversationHistory: v.array(
    v.object({
      type: v.string(),
      timestamp: v.number(),
      content: v.string(),
      questionNumber: v.optional(v.number()),
      responseTime: v.optional(v.number()),
      isValidQuestion: v.optional(v.boolean()),
    })
  ),
  lastActivityAt: v.number(),
});
```

### 2. Follow-Up Session Management

Create `convex/followups.ts` with core functions:

```typescript
// Start follow-up session after initial reading
export const startFollowupSession = action({
  args: { readingId: v.id("readings"), messengerId: v.string() },
  handler: async (ctx, args) => {
    // Validate user has follow-ups available
    // Set session state to "followup_available"
    // Return session info with question limit
  },
});

// Process follow-up question
export const askFollowupQuestion = action({
  args: {
    readingId: v.id("readings"),
    messengerId: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate question limit not exceeded
    // Get conversation history for AI context
    // Generate AI response (1-4 sentences)
    // Update conversation history
    // Return response with UI options
  },
});

// End follow-up session
export const endFollowupSession = action({
  args: { readingId: v.id("readings"), messengerId: v.string() },
  handler: async (ctx, args) => {
    // Set session state to "ended"
    // Return closing message
  },
});
```

### 3. AI Integration Updates

Extend `convex/tarot.ts` with conversation-aware responses:

```typescript
export async function generateFollowupResponse(
  question: string,
  conversationHistory: ConversationEntry[],
  cards: DrawnCard[],
  userName?: string
): Promise<string> {
  // Build context from conversation history
  // Generate focused response (1-4 sentences)
  // Validate response length
  // Return conversational response
}
```

### 4. Facebook Messenger UI Updates

Update `convex/facebookApi.ts` for follow-up interactions:

```typescript
export async function sendFollowupResponse(
  messengerId: string,
  response: string,
  remainingQuestions: number
): Promise<void> {
  const quickReplies = [
    {
      content_type: "text",
      title:
        remainingQuestions > 0
          ? "Ask Another Question"
          : "Upgrade for More Questions",
      payload: "FOLLOWUP_QUESTION",
    },
    {
      content_type: "text",
      title: "End Reading",
      payload: "END_READING_SESSION",
    },
  ];

  await sendMessage(messengerId, response, quickReplies);
}
```

### 5. Webhook Handler Updates

Update `convex/http.ts` webhook handler:

```typescript
// Handle follow-up quick replies and postbacks
if (event.message?.quick_reply?.payload === "FOLLOWUP_QUESTION") {
  // Show question input prompt
} else if (event.postback?.payload === "END_READING_SESSION") {
  // End follow-up session
} else if (isFollowupQuestion(event.message?.text)) {
  // Process as follow-up question
}
```

## Testing the Feature

### Manual Testing Steps

1. **Initial Reading**:

   ```bash
   # Send message to bot: "What does my future hold?"
   # Verify reading completes with follow-up option
   ```

2. **Follow-Up Question**:

   ```bash
   # Click "Ask Another Question"
   # Send: "What about my career?"
   # Verify response is 1-4 sentences with end option
   ```

3. **Subscription Limits**:

   ```bash
   # Free user: Verify limited to 1 follow-up
   # Pro user: Verify limited to 3 follow-ups
   # Pro+ user: Verify limited to 5 follow-ups
   ```

4. **Session End**:
   ```bash
   # Click "End Reading" button
   # Verify session ends with closing message
   ```

### Automated Testing

```typescript
// convex/followups.test.ts
describe("Follow-up Questions", () => {
  test("follow-up limit enforcement", async () => {
    // Test free user gets 1 follow-up
    // Test pro user gets 3 follow-ups
  });

  test("conversation threading", async () => {
    // Test AI maintains context across questions
    // Test conversation history accuracy
  });

  test("response length validation", async () => {
    // Test responses are 1-4 sentences
    // Test response time < 3 seconds
  });
});
```

## Configuration

### Environment Variables

No new environment variables required. Uses existing:

- `GEMINI_API_KEY` - For AI responses
- `FACEBOOK_PAGE_ACCESS_TOKEN` - For Messenger integration

### Subscription Tier Configuration

Update subscription logic in `convex/constants.ts`:

```typescript
export const SUBSCRIPTION_FOLLOWUP_LIMITS = {
  free: 1,
  mystic: 3, // pro
  oracle: 5, // pro+
  pro: 3, // backward compatibility
  "pro+": 5, // backward compatibility
};
```

## Monitoring & Analytics

### Key Metrics to Track

- Follow-up engagement rate (users who ask ≥1 follow-up)
- Average questions per session
- Response time distribution
- Session completion rate
- Subscription upgrade conversions from follow-up limits

### Performance Monitoring

```typescript
// Track response times
const startTime = Date.now();
const response = await generateFollowupResponse(question, history, cards);
const responseTime = Date.now() - startTime;

// Log if > 3 seconds
if (responseTime > 3000) {
  console.warn(`Slow follow-up response: ${responseTime}ms`);
}
```

## Troubleshooting

### Common Issues

1. **Follow-ups not appearing**: Check session state is set to "followup_available"
2. **AI responses too long**: Verify prompt includes "1-4 sentences" instruction
3. **Limit not enforced**: Check subscription tier mapping in user profile
4. **Conversation lost**: Ensure conversation history is properly persisted

### Debug Commands

```bash
# Check user session state
bunx convex run users:getSessionState --args '{"messengerId":"1234567890"}'

# View conversation history
bunx convex run followups:getConversationHistory --args '{"readingId":"reading_id"}'

# Test follow-up limit calculation
bunx convex run users:getFollowupLimit --args '{"userType":"free"}'
```

## Deployment Checklist

- [ ] Database schema updated and migrated
- [ ] Follow-up functions deployed
- [ ] AI prompts updated for conversational responses
- [ ] Messenger webhook handlers updated
- [ ] Subscription limits configured
- [ ] Testing completed for all user tiers
- [ ] Performance monitoring enabled
- [ ] Error handling verified for edge cases
