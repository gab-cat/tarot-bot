# AI Features Implementation Guide

## Overview

This document details the implementation of advanced AI features in the Tarot Bot: **Reading Memory (RAG)** and **Emotional Analysis**. These features enhance the bot's ability to provide personalized, context-aware tarot readings.

## 🎯 Features Implemented

### 1. Reading Memory (RAG)

- **Purpose**: AI remembers and references past readings for continuity
- **Technology**: Retrieval-Augmented Generation with vector embeddings
- **Benefits**: Personalized spiritual journeys, contextual insights

### 2. Emotional Analysis

- **Purpose**: Detects user's emotional state to adapt AI responses
- **Technology**: Gemini 2.5 Flash-Lite for real-time emotion detection
- **Benefits**: Empathetic, emotionally appropriate guidance

## 🏗️ Architecture

### Modular AI Structure

```
convex/ai/
├── interpretationModel.ts    # Core AI interpretation logic
├── emotionalAnalysis.ts      # Emotion detection and tone mapping
└── factory.ts               # AI model instantiation

convex/
├── embeddings.ts            # Vector embeddings for semantic search
├── rag.ts                   # Reading memory context building
├── schema.ts               # Database schema with new fields
└── http.ts                 # Integration into webhook flow
```

## 📊 Data Flow

### Reading Memory Flow

```
1. User Question → Embed Question Vector
2. Query Similar Past Readings → Retrieve Top-K Matches
3. Build Context String → Inject into AI Prompt
4. Generate Interpretation → Reference Past Insights
5. Store New Reading → Generate & Store Embedding
```

### Emotional Analysis Flow

```
1. User Message → Analyze Emotion
2. Detect Emotion Label → Map to Tone Guidelines
3. Adapt AI Response → Personalized Guidance
4. Store Emotion Data → Track User Patterns
```

## 🔧 Technical Implementation

### Vector Embeddings

```typescript
// Model: embedding-001 (1536 dimensions)
const embedding = await ai.models.embedContent({
  model: "embedding-001",
  contents: [{ parts: [{ text: content }] }],
});

// Storage in Convex with vector index
readings: defineTable({
  // ... existing fields
  embedding: v.optional(v.array(v.float64())),
}).vectorIndex("by_embedding", {
  vectorField: "embedding",
  dimensions: 1536,
});
```

### Emotion Detection

```typescript
// Fast model for real-time analysis
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-lite",
  contents: `Analyze emotion in: "${text}"`
});

// Returns structured JSON with label and scores
{
  "label": "anxious",
  "scores": { "anxious": 85, "sad": 10, ... }
}
```

### RAG Context Building

```typescript
// Retrieve similar readings
const similarReadings = await ctx.vectorSearch("readings", "by_embedding", {
  vector: questionEmbedding,
  limit: 3,
  filter: (q) => q.eq("userId", userId),
});

// Format for AI prompt
const context = similarReadings
  .map((reading) => `[READING] ${date}: ${question} → ${keyInsights}`)
  .join("\n\n");
```

## 🎨 AI Prompt Engineering

### System Prompt Enhancement

```typescript
PAST READING CONTEXT GUIDANCE:
When previous readings are provided in the context, analyze if the current question relates to themes, situations, or concerns from past readings. If there are meaningful connections:

1. REFERENCE SPECIFIC PAST READINGS: Mention which past reading(s) you're drawing from and why they relate to the current question.
2. CONNECT PATTERNS: If you see recurring card themes, emotional patterns, or situational similarities, explicitly connect them.
3. PROVIDE CONTINUITY: Show how the current reading builds upon or evolves from previous insights.
4. BE SPECIFIC: Reference concrete elements like "similar to your Lovers card from October 15th" rather than vague references.
```

### Emotional Tone Guidelines

```typescript
const toneGuidelines = {
  anxious:
    "Use calming, reassuring, and supportive language. Emphasize inner strength and guidance.",
  sad: "Be empathetic, gentle, and comforting. Offer hope and understanding.",
  hopeful:
    "Be encouraging, positive, and affirming. Reinforce potential and growth.",
  angry:
    "Maintain a calm, neutral, and objective tone. Focus on constructive paths forward and self-control.",
  confused:
    "Provide clarity, simplicity, and direct guidance. Break down complex ideas.",
  neutral: "Maintain a balanced, insightful, and friendly tone.",
};
```

## 📈 Performance & Monitoring

### Key Metrics to Monitor

- **Embedding Success Rate**: Percentage of readings successfully embedded
- **RAG Context Retrieval**: Average context length and retrieval time
- **Emotion Detection Accuracy**: User feedback on tone appropriateness
- **AI Response Times**: Latency impact of additional processing

### Log Messages to Watch

```
✅ "System Prompt:" - Full AI prompt logged
✅ "🧠 Memory context found (X chars)" - RAG working
✅ "Failed to analyze emotion" - Emotion analysis errors
❌ "Error computing embedding" - Embedding failures
```

## 🔍 Troubleshooting

### Common Issues

#### RAG Context Not Appearing

- **Check**: Vector embeddings being generated
- **Verify**: Convex vector search working
- **Test**: Query similar readings directly

#### Emotion Analysis Failing

- **Check**: Gemini API key configured
- **Verify**: JSON parsing handling markdown correctly
- **Test**: Direct emotion analysis calls

#### High Latency

- **Check**: Embedding generation not blocking main flow
- **Verify**: Async operations using `ctx.scheduler.runAfter()`
- **Optimize**: Batch embedding operations if needed

## 🚀 Future Enhancements

### Potential Improvements

- **Fine-tuned Models**: Custom-trained tarot interpretation models
- **Advanced RAG**: Multi-hop reasoning across reading chains
- **Emotion Trends**: Analyze emotional patterns over time
- **Personalization**: User-specific interpretation styles
- **Multilingual**: Support for multiple languages

### Scaling Considerations

- **Embedding Storage**: Consider embedding compression for large datasets
- **Vector Search**: Evaluate performance with 10K+ readings per user
- **Caching**: Implement response caching for similar questions
- **Batch Processing**: Group embedding operations for efficiency

## 📚 Resources

### Documentation Links

- [Convex Vector Search](https://docs.convex.dev/database/vector-search)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [RAG Implementation Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/)

### Code References

- `convex/ai/interpretationModel.ts` - Core AI logic
- `convex/rag.ts` - Memory context building
- `convex/embeddings.ts` - Vector operations
- `convex/schema.ts` - Database schema
