import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Build reading memory context for RAG by retrieving and formatting similar past readings.
 * Returns a compact context string suitable for inclusion in AI prompts.
 */
export const buildReadingMemoryContext = action({
  args: {
    userId: v.id("users"),
    currentQuestion: v.string(),
    k: v.optional(v.number()), // Number of similar readings to retrieve
  },
  handler: async (ctx, args): Promise<string> => {
    const k = args.k || 3;

    try {
      // First, compute embedding for the current question
      const questionEmbedding = await ctx.runAction(api.embeddings.computeReadingEmbedding, {
        text: args.currentQuestion,
      });

      if (questionEmbedding.length === 0) {
        console.warn("Failed to compute embedding for question, skipping RAG context");
        return "";
      }

      // Retrieve similar readings using vector search
      const similarReadings = await ctx.runQuery(api.embeddings.retrieveSimilarReadings, {
        userId: args.userId,
        vector: questionEmbedding,
        limit: k,
        timeDecay: 24, // Boost recent readings within 24 hours
      });

      if (similarReadings.length === 0) {
        return "";
      }

      // Format the context with key details from similar readings
      const contextParts = similarReadings.map((reading, index: number) => {
        try {
          const date = new Date(reading.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          // Extract key card information
          const cardNames = reading.cards?.map((card) => card.name?.replace(/[^\x20-\x7E]/g, '') || 'Unknown').slice(0, 3).join(', ') || 'Unknown cards';
          const positions = reading.cards?.map((card) => card.position).join('/') || 'Past/Present/Future';

          // Extract key themes from interpretation for better matching
          const interpretation = reading.interpretation || '';
          const question = reading.question || 'General guidance';

          // Sanitize question and interpretation to remove problematic characters
          const safeQuestion = question.replace(/[^\x20-\x7E\n\r\t]/g, '').trim() || 'General guidance';
          const safeInterpretation = interpretation.replace(/[^\x20-\x7E\n\r\t]/g, '').trim() || '';

          // Get first 2-3 sentences for context (usually contains main themes)
          const sentences = safeInterpretation.split('. ').filter((s: string) => s.trim().length > 10);
          const keyInsights = sentences.slice(0, 2).join('. ').trim();
          const truncatedInterpretation = keyInsights.length > 250
            ? keyInsights.substring(0, 250) + '...'
            : keyInsights + (sentences.length > 2 ? '.' : '');

          return `[READING ${index + 1}] ${date}
Question: "${safeQuestion}"
Cards: ${cardNames} (${positions})
Key Themes: ${truncatedInterpretation}`;
        } catch (error) {
          console.warn(`Error formatting reading ${index}:`, error);
          return `[READING ${index + 1}] Previous reading available but formatting failed.`;
        }
      });

      // Add header and format as a cohesive context block
      const context = `=== Previous Readings for Reference ===
${contextParts.join('\n\n')}

These past readings may provide relevant context and patterns for the current question.`;

      // Ensure the context is properly serializable
      // The issue might be with certain Unicode characters, so we'll use JSON.stringify/parse to validate
      try {
        // Test if the string can be safely serialized
        JSON.stringify(context);
        return context;
      } catch (jsonError) {
        console.warn("Context contains non-serializable characters, using fallback", jsonError);
        // Fallback: create a simpler, guaranteed serializable version
        const simpleContext = `Previous readings context available but contains formatting issues. Focus on the current reading.`;
        return simpleContext;
      }
    } catch (error) {
      console.error("Error building RAG context:", error);
      // Return empty context to gracefully degrade
      return "";
    }
  },
});

/**
 * Build a compact summary of reading context for embedding.
 * This is used when we want to embed a reading for future retrieval.
 * Includes both question and interpretation for comprehensive semantic matching.
 */
export function buildReadingSummaryForEmbedding(reading: {
  question?: string;
  cards: Array<{ name: string; position: string; reversed: boolean }>;
  interpretation: string;
}): string {
  const question = reading.question || "General guidance";
  const cardSummary = reading.cards
    .slice(0, 3) // Limit to first 3 cards for brevity
    .map(card => `${card.name}${card.reversed ? ' (Reversed)' : ''}`)
    .join(', ');

  // Include full interpretation (typically 200-500 words, well within embedding limits)
  // This provides rich semantic context for better similarity matching
  const fullInterpretation = reading.interpretation;

  return `Question: ${question}\nCards: ${cardSummary}\nInterpretation: ${fullInterpretation}`;
}
