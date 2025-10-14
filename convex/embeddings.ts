import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { api, internal } from "./_generated/api";

/**
 * Compute embeddings for text using Gemini's embedding-001 model.
 * See: https://ai.google.dev/gemini-api/docs/models/gemini#embedding-001
 */
export const computeReadingEmbedding = action({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, args): Promise<number[]> => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn("GEMINI_API_KEY not found, returning empty embedding");
      return [];
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      // Use the gemini-embedding-001 model for high-quality embeddings
      const result = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: [{
          parts: [{ text: args.text }],
        }],
      });

      return result.embeddings?.[0]?.values || [];
    } catch (error) {
      console.error("Error computing embedding:", error);
      // Return empty array to gracefully degrade
      return [];
    }
  },
});

/**
 * Query to retrieve similar readings using vector search.
 * Filters by userId and boosts recent readings.
 * See: https://docs.convex.dev/search/vector-search
 */
export const retrieveSimilarReadings = query({
  args: {
    userId: v.id("users"),
    vector: v.array(v.float64()),
    limit: v.optional(v.number()),
    timeDecay: v.optional(v.number()), // Hours to decay recency weight
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const timeDecay = args.timeDecay || 24; // Default 24 hours decay

    try {
      // For now, implement simple recency-based retrieval
      // TODO: Replace with proper vector search when API is available
      const userReadings = await ctx.db
        .query("readings")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc") // Most recent first
        .take(limit * 2); // Get more candidates

      if (userReadings.length === 0) {
        return [];
      }

      // Apply recency boost (simple implementation)
      const now = Date.now();
      const decayMs = timeDecay * 60 * 60 * 1000;

      const boostedResults = userReadings
        .map((reading) => {
          const ageMs = now - reading.createdAt;
          const recencyBoost = Math.exp(-ageMs / decayMs);
          return {
            ...reading,
            _score: recencyBoost, // Simple recency score for now
            _boostedScore: recencyBoost,
          };
        })
        .sort((a, b) => b._boostedScore - a._boostedScore)
        .slice(0, limit);

      return boostedResults;
    } catch (error) {
      console.error("Error in similar readings retrieval:", error);
      return [];
    }
  },
});

/**
 * Internal action to compute and store embedding for a reading.
 * Called after interpretation is generated.
 * Uses enhanced embedding that includes question + cards + full interpretation.
 */
export const storeReadingEmbedding = action({
  args: {
    readingId: v.id("readings"),
    text: v.string(), // Legacy: just interpretation text
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Get the full reading data for comprehensive embedding
      const reading = await ctx.runQuery(api.readings.getById, { readingId: args.readingId });
      if (!reading) {
        console.warn(`Reading ${args.readingId} not found for embedding`);
        return;
      }

      // Use enhanced embedding that includes question, cards, and full interpretation
      const { buildReadingSummaryForEmbedding } = await import("./rag");
      const embeddingText = buildReadingSummaryForEmbedding({
        question: reading.question,
        cards: reading.cards,
        interpretation: reading.interpretation,
      });

      const embedding = await ctx.runAction(api.embeddings.computeReadingEmbedding, {
        text: embeddingText,
      });

      if (embedding.length > 0) {
        await ctx.runMutation(internal.readings.updateReadingEmbedding, {
          readingId: args.readingId,
          embedding,
        });
      }
    } catch (error) {
      console.error("Failed to store reading embedding:", error);
      // Don't throw - embedding is optional for functionality
    }
  },
});

/**
 * Helper function to get embedding dimensions for a model.
 * Currently hardcoded for embedding-001 (1536 dimensions).
 */
export function getEmbeddingDimensions(): number {
  // embedding-001 produces 1536-dimensional vectors
  // See: https://ai.google.dev/gemini-api/docs/models/gemini#embedding-001
  return 1536;
}
