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

export const canReadToday = query({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (!user) return true; // New users can read

    const lastReadingDate = user.lastReadingDate;
    if (!lastReadingDate) return true; // No previous reading

    const today = new Date();
    const lastReading = new Date(lastReadingDate);

    // Check if last reading was today
    return !(
      today.getFullYear() === lastReading.getFullYear() &&
      today.getMonth() === lastReading.getMonth() &&
      today.getDate() === lastReading.getDate()
    );
  },
});

export const markReadingDone = mutation({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (!user) {
      // Create user if they don't exist
      await ctx.db.insert("users", {
        messengerId: args.messengerId,
        isSubscribed: true,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        lastReadingDate: Date.now(),
        sessionState: undefined, // End session after reading
      });
    } else {
      // Update existing user
      await ctx.db.patch(user._id, {
        lastReadingDate: Date.now(),
        lastActiveAt: Date.now(),
        sessionState: undefined, // End session after reading
      });
    }
  },
});

export const startSession = mutation({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (!user) {
      return await ctx.db.insert("users", {
        messengerId: args.messengerId,
        isSubscribed: true,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        sessionState: "waiting_question",
      });
    } else {
      await ctx.db.patch(user._id, {
        lastActiveAt: Date.now(),
        sessionState: "waiting_question",
      });
      return user._id;
    }
  },
});

export const getSessionState = query({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    return user?.sessionState || null;
  },
});

export const endSession = mutation({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        sessionState: undefined,
        lastActiveAt: Date.now(),
      });
    }
  },
});
