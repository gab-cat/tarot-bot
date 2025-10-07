import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createOrUpdateUser = mutation({
  args: {
    messengerId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        lastActiveAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", {
        messengerId: args.messengerId,
        firstName: args.firstName,
        lastName: args.lastName,
        isSubscribed: true,
        createdAt: now,
        lastActiveAt: now,
      });
    }
  },
});
