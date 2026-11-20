// Reading memory: each reading is embedded once into `readingEmbeddings`, and a new
// question pulls the user's related past readings into the prompt.
//
// Before Nov 2026 the "similar readings" query ignored the embedding and returned the
// latest readings. Readings from before then were deliberately not re-embedded (Gab's
// call), so memory covers readings made from Nov 21, 2026 on.

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { embedDocument, embedQuery } from "./ai/gemini";
import { rateRelatedReadings } from "./ai/jev";
import { formatManilaDate } from "./lib/time";

// Vector search finds candidates; Jev decides which are about the same situation (it
// separated related from unrelated readings at about 0.85 vs under 0.1 in testing).
// Without Jev, fall back to a cosine cut-off that has not been calibrated on real data.
const CANDIDATES = 6;
const MIN_COSINE_CANDIDATE = 0.3;
const MIN_COSINE_FALLBACK = 0.5;
const MIN_RELATED_PROBABILITY = 0.5;

export function readingEmbeddingText(reading: {
  question?: string;
  cards: Array<{ name: string; reversed: boolean }>;
  interpretation: string;
}): string {
  const cards = reading.cards.map((card) => `${card.name}${card.reversed ? " (Reversed)" : ""}`).join(", ");
  return `Question: ${reading.question || "General guidance"}\nCards: ${cards}\nInterpretation: ${reading.interpretation}`;
}

export const hasEmbedding = internalQuery({
  args: { readingId: v.id("readings") },
  handler: async (ctx, args) =>
    (await ctx.db
      .query("readingEmbeddings")
      .withIndex("by_reading", (q) => q.eq("readingId", args.readingId))
      .first()) !== null,
});

export const saveEmbedding = internalMutation({
  args: { readingId: v.id("readings"), userId: v.id("users"), embedding: v.array(v.float64()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("readingEmbeddings")
      .withIndex("by_reading", (q) => q.eq("readingId", args.readingId))
      .first();
    if (existing) await ctx.db.patch("readingEmbeddings", existing._id, { embedding: args.embedding });
    else await ctx.db.insert("readingEmbeddings", args);
  },
});

/** Scheduled by readings:createReading. Safe to run twice. */
export const storeReadingEmbedding = internalAction({
  args: { readingId: v.id("readings") },
  handler: async (ctx, args) => {
    const reading = await ctx.runQuery(internal.readings.getById, { readingId: args.readingId });
    if (!reading) return;
    try {
      const embedding = await embedDocument(readingEmbeddingText(reading));
      await ctx.runMutation(internal.embeddings.saveEmbedding, { readingId: reading._id, userId: reading.userId, embedding });
    } catch (error) {
      // Memory is optional: a reading without an embedding just isn't recalled later.
      console.warn("Reading embedding failed", error);
    }
  },
});

/**
 * Past readings related to the question, formatted for the prompt. Returns "" when
 * there are none or anything fails: memory must never block a reading.
 */
export async function buildReadingMemoryContext(ctx: ActionCtx, userId: Id<"users">, question: string, k = 3): Promise<string> {
  try {
    const vector = await embedQuery(question);
    const matches = await ctx.vectorSearch("readingEmbeddings", "by_embedding", {
      vector,
      limit: CANDIDATES,
      filter: (q) => q.eq("userId", userId),
    });
    const candidates = matches.filter((match) => match._score >= MIN_COSINE_CANDIDATE);
    if (candidates.length === 0) return "";

    const rows = await ctx.runQuery(internal.embeddings.readingIdsFor, { embeddingIds: candidates.map((m) => m._id) });
    const cosineByReading = new Map(
      rows.map((row) => [row.readingId, candidates.find((m) => m._id === row.embeddingId)?._score ?? 0]),
    );
    const readings = await ctx.runQuery(internal.readings.listByIds, { readingIds: rows.map((row) => row.readingId) });
    const summaries = readings.map((reading) => ({
      cosine: cosineByReading.get(reading._id) ?? 0,
      date: formatManilaDate(reading.createdAt),
      question: reading.question || "General guidance",
      cards: reading.cards.map((card) => `${card.name}${card.reversed ? " (Reversed)" : ""}`).join(", "),
      interpretation: reading.interpretation,
    }));

    const related = await rateRelatedReadings(
      question,
      summaries.map(({ date, question, cards }) => ({ date, question, cards })),
    );
    const chosen = related
      ? summaries
          .map((summary, i) => ({ summary, p: related[i] }))
          .filter(({ p }) => p >= MIN_RELATED_PROBABILITY)
          .sort((a, b) => b.p - a.p)
          .map(({ summary }) => summary)
      : summaries.filter((summary) => summary.cosine >= MIN_COSINE_FALLBACK);

    return chosen
      .slice(0, k)
      .map((reading, index) => {
        const sentences = reading.interpretation.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
        let keyThemes = sentences.slice(0, 2).join(" ").trim();
        if (keyThemes.length > 250) keyThemes = `${keyThemes.substring(0, 250)}...`;
        return `[Reading ${index + 1}] ${reading.date}
Question: "${reading.question}"
Cards: ${reading.cards}
Key themes: ${keyThemes}`;
      })
      .join("\n\n");
  } catch (error) {
    console.warn("Reading memory unavailable", error);
    return "";
  }
}

export const readingIdsFor = internalQuery({
  args: { embeddingIds: v.array(v.id("readingEmbeddings")) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(args.embeddingIds.map((id) => ctx.db.get("readingEmbeddings", id)));
    return rows.filter((row) => row !== null).map((row) => ({ embeddingId: row._id, readingId: row.readingId }));
  },
});
