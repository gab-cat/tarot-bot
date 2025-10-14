# Tarot Bot Documentation

## Recent Updates

### AI Enhancement: Reading Memory (RAG) + Emotional Analysis

**Status:** ✅ Implemented

**New Features:**

- **Reading Memory (RAG)**: AI remembers and references past readings for continuity
- **Emotional Analysis**: Real-time emotion detection adapts AI responses
- **Vector Embeddings**: Semantic search for finding relevant past readings
- **Enhanced Personalization**: Context-aware, emotionally intelligent responses

**Files Created/Modified:**

- `convex/ai/interpretationModel.ts` - Modular AI interpretation system
- `convex/ai/emotionalAnalysis.ts` - Emotion detection using Gemini 2.5 Flash-Lite
- `convex/embeddings.ts` - Vector embeddings for semantic search
- `convex/rag.ts` - Reading memory context building
- `convex/schema.ts` - Added embedding and emotion fields
- `convex/http.ts` - Integrated emotion + memory into webhook flow
- `convex/tarot.ts` - Enhanced with RAG and emotion context

**Technical Details:**

- Uses `embedding-001` for 1536-dimensional embeddings
- Gemini 2.5 Flash-Lite for fast emotion analysis
- Convex vector search for efficient similarity matching
- Graceful degradation when AI services unavailable

---

## AI Features Deep Dive

### Reading Memory (RAG) System

**What is RAG?**

- **Retrieval-Augmented Generation**: AI retrieves relevant context before generating responses
- **Memory System**: Stores and retrieves past readings for continuity
- **Semantic Search**: Uses vector embeddings to find conceptually similar readings

**How It Works:**

1. **Embedding Generation**: Each reading creates a vector embedding from question + interpretation + cards
2. **Query Processing**: When user asks a question, we embed it and find similar past readings
3. **Context Injection**: Past readings are added to the AI prompt for reference
4. **Enhanced Responses**: AI can reference specific past insights and build narratives

**Example Flow:**

```
User: "I'm worried about my relationship again"

1. Embed user's question
2. Find similar past reading: "How do I find love?" from 2 weeks ago
3. Add to AI prompt: "[READING 1] 2 weeks ago: Question: 'How do I find love?'..."
4. AI responds: "Drawing from your reading two weeks ago about finding love..."
```

### Emotional Analysis System

**How It Works:**

- **Input**: Every user message gets analyzed for emotional state
- **AI Model**: Gemini 2.5 Flash-Lite processes text for emotion detection
- **Output**: Label (anxious/sad/neutral/hopeful/angry/confused) + confidence scores
- **Adaptation**: AI tone adjusts based on detected emotion

**Emotion Categories:**

- **Anxious**: Calming, reassuring responses
- **Sad**: Empathetic, supportive language
- **Hopeful**: Enthusiastic, encouraging tone
- **Angry**: Calm, understanding approach
- **Confused**: Clear, patient explanations

**Integration Points:**

- **Primary Readings**: Emotion from initial question affects interpretation tone
- **Follow-ups**: Each follow-up question gets emotion analysis
- **Storage**: Emotions tracked in user profiles for patterns

### Technical Implementation

**Vector Embeddings:**

- **Model**: `embedding-001` (1536 dimensions)
- **Storage**: Convex vector index on `readings.embedding`
- **Query**: `db.vectorSearch()` with similarity scoring
- **Performance**: Non-blocking async embedding generation

**Emotion Detection:**

- **Model**: `gemini-2.5-flash-lite` (fast, low-cost)
- **Input Sanitization**: Removes problematic Unicode characters
- **JSON Parsing**: Robust error handling for AI responses
- **Fallback**: Defaults to neutral emotion on failures

**System Prompt Enhancement:**

```typescript
PAST READING CONTEXT GUIDANCE:
When previous readings are provided in the context, analyze if the current question relates to themes, situations, or concerns from past readings. If there are meaningful connections:

1. REFERENCE SPECIFIC PAST READINGS: Mention which past reading(s) you're drawing from and why they relate to the current question.
2. CONNECT PATTERNS: If you see recurring card themes, emotional patterns, or situational similarities, explicitly connect them.
3. PROVIDE CONTINUITY: Show how the current reading builds upon or evolves from previous insights.
4. BE SPECIFIC: Reference concrete elements like "similar to your Lovers card from October 15th" rather than vague references.
```

---

## Recent Updates

### Facebook API Error Fix (Error 100, Subcode 33)

**Status:** ✅ Fixed

**Files Modified:**

- `convex/facebookApi.ts` - Improved error handling and logging + message_id workaround
- `convex/http.ts` - Automatic fallback to message_id approach

**Documentation Created:**

- [`QUICK_FIX_SUMMARY.md`](./QUICK_FIX_SUMMARY.md) - Quick reference guide
- [`FACEBOOK_API_PERMISSIONS.md`](./FACEBOOK_API_PERMISSIONS.md) - Comprehensive guide
- [`WORKAROUNDS_FOR_PHONE_USERS.md`](./WORKAROUNDS_FOR_PHONE_USERS.md) - Workarounds to get user names

---

## Quick Start

### Understanding the Facebook API Error

If you see this error:

```
Facebook API error: 400
code: 100, error_subcode: 33
```

**Don't panic!** This is **normal** and **expected**.

Read: [`QUICK_FIX_SUMMARY.md`](./QUICK_FIX_SUMMARY.md) for a quick explanation.

### What's Different Now?

✅ Better error handling
✅ Clear distinction between warnings and actual errors
✅ Graceful fallbacks for all users
✅ Helpful logging to understand what's happening

### Next Steps

1. **Deploy the updated code** (if not already deployed)
2. **Monitor Convex logs** to see the improved error messages
3. **Test with different user accounts** - some will work, some won't (phone users)
4. **No action needed** unless you see permission errors for ALL users

---

## Documentation Index

| Document                                                           | Purpose                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| [AI_FEATURES_GUIDE.md](./AI_FEATURES_GUIDE.md)                     | Complete technical guide to RAG and emotion analysis |
| [AI Features Deep Dive](#ai-features-deep-dive)                    | Quick overview of AI features                        |
| [QUICK_FIX_SUMMARY.md](./QUICK_FIX_SUMMARY.md)                     | Quick reference - what changed and why               |
| [FACEBOOK_API_PERMISSIONS.md](./FACEBOOK_API_PERMISSIONS.md)       | Complete guide to Facebook permissions setup         |
| [WORKAROUNDS_FOR_PHONE_USERS.md](./WORKAROUNDS_FOR_PHONE_USERS.md) | Workarounds to get user names (with testing guide)   |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)                         | How to migrate existing users to add profile info    |

---

## Common Questions

### Q: Why can't I get some users' names?

**A:** They registered with a phone number instead of email. Facebook blocks access to their profile for privacy. This affects 30-50% of Messenger users.

### Q: Is this a bug?

**A:** No! This is intentional Facebook behavior. Your bot handles it correctly.

### Q: What should I do?

**A:** Nothing! The code now handles this gracefully. Users without accessible profiles get generic greetings instead of personalized ones.

### Q: How do I know if it's working?

**A:** Check your Convex logs. You'll see:

- ✅ Success messages for regular users
- ⚠️ Warnings for phone-registered users (normal)
- ❌ Errors only for real permission issues

### Q: How do I monitor the AI features?

**A:** Look for these log messages:

**Reading Memory (RAG):**

- `"🧠 Memory context found (X chars)"` - RAG context successfully retrieved
- `"🧠 Memory context empty"` - No similar past readings found
- `"Failed to build memory context"` - RAG system error

**Emotional Analysis:**

- `"System Prompt:"` - Shows the full AI prompt with emotion context
- `"Failed to analyze emotion"` - Emotion analysis error
- Emotion labels in user updates: `"lastEmotionLabel": "anxious"`

**Vector Embeddings:**

- `"Error computing embedding"` - Embedding generation failed
- `"Failed to store reading embedding"` - Storage error

---

## Need More Help?

1. Read the full documentation in [`FACEBOOK_API_PERMISSIONS.md`](./FACEBOOK_API_PERMISSIONS.md)
2. Check your Convex logs for specific error messages
3. Verify your Facebook Developer settings match the requirements
4. Test with multiple user accounts to see the different behaviors

---

**Remember:** Error 100/33 is **not a problem** - it's Facebook protecting user privacy! 🎉
