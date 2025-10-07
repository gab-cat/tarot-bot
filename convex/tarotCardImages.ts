import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByCardId = query({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tarotCardImages")
      .withIndex("by_card_id", (q) => q.eq("cardId", args.cardId))
      .first();
  },
});

export const getByFilename = query({
  args: { imageFilename: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tarotCardImages")
      .withIndex("by_filename", (q) => q.eq("imageFilename", args.imageFilename))
      .first();
  },
});

export const createCardImage = mutation({
  args: {
    cardId: v.string(),
    imageFilename: v.string(),
    uprightAttachmentId: v.string(),
    reversedAttachmentId: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tarotCardImages", args);
  },
});

export const updateLastUsed = mutation({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("tarotCardImages")
      .withIndex("by_card_id", (q) => q.eq("cardId", args.cardId))
      .first();

    if (image) {
      await ctx.db.patch(image._id, { lastUsedAt: Date.now() });
    }
  },
});

export const getAttachmentIdsForCards = query({
  args: {
    cards: v.array(v.object({
      filename: v.string(),
      reversed: v.boolean(),
    }))
  },
  handler: async (ctx, args) => {
    const attachmentIds: string[] = [];

    for (const card of args.cards) {
      const cachedImage = await ctx.db
        .query("tarotCardImages")
        .withIndex("by_filename", (q) => q.eq("imageFilename", card.filename))
        .first();

      if (cachedImage) {
        const attachmentId = card.reversed ? cachedImage.reversedAttachmentId : cachedImage.uprightAttachmentId;
        attachmentIds.push(attachmentId);
      } else {
        throw new Error(`No cached image found for ${card.filename}. Please run initialization first.`);
      }
    }

    return attachmentIds;
  },
});
