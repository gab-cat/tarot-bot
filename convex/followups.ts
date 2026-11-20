// Follow-up questions about a finished reading. The window lasts 10 minutes from the
// reading (autoEndFollowupSession), and each tier gets FOLLOWUP_LIMITS questions.

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { FOLLOWUP_LIMITS, FOLLOWUP_MESSAGES, QUICK_REPLIES } from "./constants";
import { getPageAccessToken, sendText } from "./lib/messenger";
import type { ConversationEntry } from "./validators";

/** Opens follow-ups on a completed reading. Idempotent. */
export const startSession = internalMutation({
  args: { readingId: v.id("readings") },
  handler: async (ctx, args) => {
    const reading = await ctx.db.get("readings", args.readingId);
    if (!reading) throw new Error("Reading not found");
    if (reading.sessionState === "followup_available" || reading.sessionState === "followup_in_progress") return;
    const user = await ctx.db.get("users", reading.userId);
    const tier = user?.userType ?? "free";
    await ctx.db.patch("readings", reading._id, {
      sessionState: "followup_available",
      maxFollowups: FOLLOWUP_LIMITS[tier] ?? FOLLOWUP_LIMITS.free,
      followupsUsed: 0,
      subscriptionTier: tier,
      lastActivityAt: Date.now(),
    });
    if (user) await ctx.db.patch("users", user._id, { lastFollowupAt: Date.now() });
  },
});

/** The user's latest reading, if it is open for follow-ups. */
export const getOpenReading = internalQuery({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();
    if (!user) return null;
    const latest = await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (!latest || (latest.sessionState !== "followup_available" && latest.sessionState !== "followup_in_progress")) return null;
    return latest;
  },
});

/**
 * Takes one question slot before calling the AI, so two quick messages can't both
 * use the last slot. Returns the question number, or null when the limit is reached
 * or the session has closed.
 */
export const reserveQuestion = internalMutation({
  args: { readingId: v.id("readings") },
  handler: async (ctx, args) => {
    const reading = await ctx.db.get("readings", args.readingId);
    if (!reading || (reading.sessionState !== "followup_available" && reading.sessionState !== "followup_in_progress")) {
      return { status: "closed" as const };
    }
    if (reading.followupsUsed >= reading.maxFollowups) return { status: "limit" as const };
    const questionNumber = reading.followupsUsed + 1;
    await ctx.db.patch("readings", reading._id, {
      followupsUsed: questionNumber,
      sessionState: "followup_in_progress",
      lastActivityAt: Date.now(),
    });
    return { status: "ok" as const, questionNumber, remaining: reading.maxFollowups - questionNumber, max: reading.maxFollowups };
  },
});

/** Gives a reserved slot back when the answer couldn't be generated. */
export const releaseQuestion = internalMutation({
  args: { readingId: v.id("readings") },
  handler: async (ctx, args) => {
    const reading = await ctx.db.get("readings", args.readingId);
    if (reading && reading.followupsUsed > 0) {
      await ctx.db.patch("readings", reading._id, { followupsUsed: reading.followupsUsed - 1 });
    }
  },
});

export const recordAnswer = internalMutation({
  args: {
    readingId: v.id("readings"),
    question: v.string(),
    answer: v.string(),
    questionNumber: v.number(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    const reading = await ctx.db.get("readings", args.readingId);
    if (!reading) return;
    const now = Date.now();
    const entries: ConversationEntry[] = [
      {
        type: "followup_question",
        timestamp: now,
        content: args.question,
        questionNumber: args.questionNumber,
        isValidQuestion: true,
      },
      { type: "followup_response", timestamp: now, content: args.answer, responseTime: args.responseTime },
    ];
    await ctx.db.patch("readings", reading._id, {
      conversationHistory: [...(reading.conversationHistory ?? []), ...entries],
      lastActivityAt: now,
    });
  },
});

/** Closes follow-ups. Returns false if the session was already closed. */
export const endSession = internalMutation({
  args: { readingId: v.id("readings") },
  handler: async (ctx, args) => {
    const reading = await ctx.db.get("readings", args.readingId);
    if (!reading || (reading.sessionState !== "followup_available" && reading.sessionState !== "followup_in_progress"))
      return false;
    const now = Date.now();
    await ctx.db.patch("readings", reading._id, {
      sessionState: "ended",
      conversationHistory: [
        ...(reading.conversationHistory ?? []),
        { type: "session_end", timestamp: now, content: "Follow-up session ended" },
      ],
      lastActivityAt: now,
    });
    return true;
  },
});

/** Scheduled 10 minutes after the reading. */
export const autoEndFollowupSession = internalAction({
  args: { readingId: v.id("readings"), messengerId: v.string() },
  handler: async (ctx, args) => {
    const ended = await ctx.runMutation(internal.followups.endSession, { readingId: args.readingId });
    if (!ended) return;
    const accessToken = getPageAccessToken();
    if (accessToken)
      await sendText(args.messengerId, FOLLOWUP_MESSAGES.windowEnded, accessToken, [QUICK_REPLIES.start], "UPDATE");
  },
});
