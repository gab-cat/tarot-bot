import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Cached attachment ids, in the order asked; null for cards not uploaded yet. */
export const getAttachmentIds = internalQuery({
  args: { cards: v.array(v.object({ filename: v.string(), reversed: v.boolean() })) },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.cards.map(async (card) => {
        const cached = await ctx.db
          .query("tarotCardImages")
          .withIndex("by_filename", (q) => q.eq("imageFilename", card.filename))
          .first();
        if (!cached) return null;
        return card.reversed ? cached.reversedAttachmentId : cached.uprightAttachmentId;
      }),
    );
  },
});

export const getByCardId = internalQuery({
  args: { cardId: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("tarotCardImages")
      .withIndex("by_card_id", (q) => q.eq("cardId", args.cardId))
      .first(),
});

/** Upsert by filename, so two readings caching the same card can't leave duplicates. */
export const saveCardImage = internalMutation({
  args: {
    cardId: v.string(),
    imageFilename: v.string(),
    uprightAttachmentId: v.string(),
    reversedAttachmentId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tarotCardImages")
      .withIndex("by_filename", (q) => q.eq("imageFilename", args.imageFilename))
      .first();
    if (existing) {
      await ctx.db.patch("tarotCardImages", existing._id, { ...args, lastUsedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("tarotCardImages", { ...args, createdAt: now, lastUsedAt: now });
  },
});
