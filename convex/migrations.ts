// Data migrations. Each one is batched, resumable, idempotent and has a dry run.
// Run on dev first; show Gab the dry-run numbers before running on prod.

import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { embedDocument } from "./ai/gemini";
import { readingEmbeddingText } from "./embeddings";
import { LEGACY_FALLBACK_MARKER } from "./constants";
import type { Id } from "./_generated/dataModel";
import type { StoredCard } from "./validators";

export const readingsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("readings").order("asc").paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((reading) => ({
        _id: reading._id,
        userId: reading.userId,
        question: reading.question,
        cards: reading.cards,
        interpretation: reading.interpretation,
      })),
    };
  },
});

/**
 * Embeds every reading that has no row in `readingEmbeddings` (gemini-embedding-2,
 * 1536-d), skipping old canned fallback readings. Only adds rows; the legacy `readings.embedding` field is left alone. About 500 input tokens per
 * reading at $0.20 per 1M, so 10,000 readings cost about $1.
 *
 *   npx convex run migrations:backfillReadingEmbeddings '{"dryRun": true}'
 *   npx convex run migrations:backfillReadingEmbeddings '{}'
 *
 * Reverting: the legacy vectors were never searchable (wrong size for the old index),
 * so there is nothing to restore. Delete rows from `readingEmbeddings` to redo it.
 */
export const backfillReadingEmbeddings = internalAction({
  args: { cursor: v.optional(v.string()), batchSize: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<{ embedded: number; failed: number; isDone: boolean }> => {
    const batchSize = Math.min(args.batchSize ?? 25, 100);
    const page: {
      page: Array<{
        _id: Id<"readings">;
        userId: Id<"users">;
        question?: string;
        cards: StoredCard[];
        interpretation: string;
      }>;
      isDone: boolean;
      continueCursor: string;
    } = await ctx.runQuery(internal.migrations.readingsPage, {
      paginationOpts: { cursor: args.cursor ?? null, numItems: batchSize },
    });

    let embedded = 0;
    let failed = 0;
    for (const reading of page.page) {
      const done = await ctx.runQuery(internal.embeddings.hasEmbedding, { readingId: reading._id });
      if (done) continue;
      if (reading.interpretation.includes(LEGACY_FALLBACK_MARKER)) continue; // canned text, not a real reading
      if (args.dryRun) {
        embedded++;
        continue;
      }
      try {
        const embedding = await embedDocument(readingEmbeddingText(reading));
        await ctx.runMutation(internal.embeddings.saveEmbedding, { readingId: reading._id, userId: reading.userId, embedding });
        embedded++;
      } catch (error) {
        console.error(`Embedding failed for reading ${reading._id}`, error);
        failed++;
      }
    }

    console.log(
      `backfillReadingEmbeddings: ${args.dryRun ? "would embed" : "embedded"} ${embedded}, failed ${failed}, done=${page.isDone}`,
    );
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillReadingEmbeddings, {
        cursor: page.continueCursor,
        batchSize,
        dryRun: args.dryRun,
      });
    }
    return { embedded, failed, isDone: page.isDone };
  },
});
