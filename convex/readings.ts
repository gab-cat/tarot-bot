import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createReading = mutation({
  args: {
    userId: v.id("users"),
    messengerId: v.string(),
    question: v.optional(v.string()),
    cards: v.array(v.object({
      id: v.string(),
      name: v.string(),
      meaning: v.string(),
      position: v.string(),
      reversed: v.boolean(),
    })),
    interpretation: v.string(),
    readingType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("readings", {
      userId: args.userId,
      messengerId: args.messengerId,
      question: args.question,
      cards: args.cards,
      interpretation: args.interpretation,
      readingType: args.readingType,
      createdAt: Date.now(),
    });
  },
});
