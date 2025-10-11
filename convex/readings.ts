import { type Doc, type Id } from "./_generated/dataModel";
import { mutation, internalMutation, query, internalQuery, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
      description: v.string(),
      cardType: v.string(),
    })),
    interpretation: v.string(),
    readingType: v.string(),
  },
  handler: async (ctx, args) => {
    const readingId = await ctx.db.insert("readings", {
      userId: args.userId,
      messengerId: args.messengerId,
      question: args.question,
      cards: args.cards,
      interpretation: args.interpretation,
      readingType: args.readingType as "question" | "daily" | "manual",
      sessionState: "active",
      subscriptionTier: "free", // Will be updated when reading completes
      maxFollowups: 0, // Will be set when follow-ups start
      followupsUsed: 0,
      conversationHistory: [{
        type: "initial_reading",
        timestamp: Date.now(),
        content: args.interpretation,
      }],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    // Check if user has reached their daily limit and schedule notification if needed
    const user = await ctx.db.get(args.userId);
    if (user && user.userType !== "oracle" && user.userType !== "pro+") {
      // Count today's readings for this user
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();

      const todaysReadingCount = await ctx.db
        .query("readings")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.gte(q.field("createdAt"), startOfDay) && q.lt(q.field("createdAt"), endOfDay))
        .collect();

      // Check limits based on user type
      const hasReachedLimit = user.userType === "free"
        ? todaysReadingCount.length >= 1
        : todaysReadingCount.length >= 5; // mystic, pro

      if (hasReachedLimit) {
        // Schedule notification for next midnight
        await ctx.runMutation(internal.notifications.scheduleReadingAvailableNotification, {
          messengerId: args.messengerId,
        });
      } else {
        // Cancel any existing scheduled notification since they haven't reached limit
        await ctx.runMutation(internal.notifications.cancelScheduledNotification, {
          messengerId: args.messengerId,
        });
      }
    }

    return readingId;
  },
});

export const getById = query({
  args: {
    readingId: v.id("readings"),
  },
  handler: async (ctx: QueryCtx, args: {
    readingId: Id<"readings">;
  }) => {
    return await ctx.db.get(args.readingId);
  },
});

export const getTodaysReadingCountByUser = internalQuery({
  args: {
    userId: v.id("users"),
    startOfDay: v.number(),
    endOfDay: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), args.startOfDay) && q.lt(q.field("createdAt"), args.endOfDay))
      .collect();
  },
});

export const updateSessionState = internalMutation({
  args: {
    readingId: v.id("readings"),
    sessionState: v.optional(v.union(v.literal("active"), v.literal("followup_available"), v.literal("followup_in_progress"), v.literal("completed"), v.literal("ended"))),
    maxFollowups: v.optional(v.number()),
    followupsUsed: v.optional(v.number()),
    subscriptionTier: v.optional(v.string()),
    conversationHistory: v.optional(v.array(v.any())),
    lastActivityAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reading = await ctx.db.get(args.readingId);
    if (!reading) {
      throw new Error("Reading not found");
    }

    const updates: Partial<Doc<"readings">> = {};
    if (args.sessionState !== undefined) updates.sessionState = args.sessionState;
    if (args.maxFollowups !== undefined) updates.maxFollowups = args.maxFollowups;
    if (args.followupsUsed !== undefined) updates.followupsUsed = args.followupsUsed;
    if (args.subscriptionTier !== undefined) updates.subscriptionTier = args.subscriptionTier as "free" | "mystic" | "oracle" | "pro" | "pro+";
    if (args.conversationHistory !== undefined) updates.conversationHistory = args.conversationHistory;
    if (args.lastActivityAt !== undefined) updates.lastActivityAt = args.lastActivityAt;

    await ctx.db.patch(args.readingId, updates);
  },
});

export const updateAfterQuestion = internalMutation({
  args: {
    readingId: v.id("readings"),
    followupsUsed: v.number(),
    conversationHistory: v.array(v.any()),
    sessionState: v.union(v.literal("active"), v.literal("followup_available"), v.literal("followup_in_progress"), v.literal("completed"), v.literal("ended")),
    lastActivityAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.readingId, {
      followupsUsed: args.followupsUsed,
      conversationHistory: args.conversationHistory,
      sessionState: args.sessionState,
      lastActivityAt: args.lastActivityAt,
    });
  },
});
