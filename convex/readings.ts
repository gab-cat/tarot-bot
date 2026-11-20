import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { countReadingsToday, dailyReadingLimit } from "./users";
import { cancelReadingNotification, scheduleReadingNotification } from "./notifications";
import { emotionScoresValidator, readingTypeValidator, storedCardValidator } from "./validators";

export const createReading = internalMutation({
  args: {
    userId: v.id("users"),
    messengerId: v.string(),
    question: v.optional(v.string()),
    cards: v.array(storedCardValidator),
    interpretation: v.string(),
    readingType: readingTypeValidator,
    emotionLabel: v.optional(v.string()),
    emotionScores: v.optional(emotionScoresValidator),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) throw new Error("createReading: user not found");

    const now = Date.now();
    const readingId = await ctx.db.insert("readings", {
      ...args,
      sessionState: "active",
      subscriptionTier: user.userType,
      maxFollowups: 0, // set when the follow-up session starts
      followupsUsed: 0,
      conversationHistory: [{ type: "initial_reading", timestamp: now, content: args.interpretation }],
      createdAt: now,
      lastActivityAt: now,
    });

    // Old rows have no counter; count them once (this reading included).
    const readingCount =
      user.readingCount !== undefined
        ? user.readingCount + 1
        : (
            await ctx.db
              .query("readings")
              .withIndex("by_user", (q) => q.eq("userId", args.userId))
              .collect()
          ).length;
    await ctx.db.patch("users", user._id, { readingCount });

    // Tell limited users when their next reading unlocks.
    const limit = dailyReadingLimit(user.userType);
    if (limit !== Infinity) {
      const today = await countReadingsToday(ctx, args.userId, limit, now);
      if (today >= limit) await scheduleReadingNotification(ctx, user);
      else await cancelReadingNotification(ctx, user);
    }

    await ctx.scheduler.runAfter(0, internal.embeddings.storeReadingEmbedding, { readingId });
    return readingId;
  },
});

export const getById = internalQuery({
  args: { readingId: v.id("readings") },
  handler: async (ctx, args) => await ctx.db.get("readings", args.readingId),
});

/** The fields prompts need, newest first. */
export const listRecentForUser = internalQuery({
  args: { userId: v.id("users"), limit: v.number() },
  handler: async (ctx, args) => {
    const readings = await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(Math.min(args.limit, 20));
    return readings.map(({ question, cards, interpretation, createdAt }) => ({ question, cards, interpretation, createdAt }));
  },
});

export const listByIds = internalQuery({
  args: { readingIds: v.array(v.id("readings")) },
  handler: async (ctx, args) => {
    const readings = await Promise.all(args.readingIds.slice(0, 20).map((id) => ctx.db.get("readings", id)));
    return readings
      .filter((reading) => reading !== null)
      .map(({ _id, question, cards, interpretation, createdAt }) => ({ _id, question, cards, interpretation, createdAt }));
  },
});
