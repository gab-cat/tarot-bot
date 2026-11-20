// Hand-run repairs. Internal only: `npx convex run admin:<name> '<json args>'`.

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { formatCardSummary, toBoldFont } from "./constants";
import { generateReading } from "./ai/gemini";
import { toneGuidelines } from "./ai/prompts";
import { getPageAccessToken, sendText } from "./lib/messenger";
import { fullName } from "./lib/text";
import { DAY_MS } from "./lib/time";
import type { EmotionLabel } from "./validators";

// Before Nov 2026 a failed Gemini call silently stored and sent this canned text.
const FALLBACK_MARKER = "draws forth a fascinating journey";

/** The most recent readings whose interpretation is the old canned fallback. */
export const findFallbackReadings = internalQuery({
  args: { scan: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query("readings")
      .order("desc")
      .take(Math.min(args.scan ?? 200, 1000));
    const fallbacks = recent.filter((reading) => reading.interpretation.includes(FALLBACK_MARKER));
    return await Promise.all(
      fallbacks.map(async (reading) => {
        const user = await ctx.db.get("users", reading.userId);
        const lastMessageAt = user?.lastMessageAt ?? user?.lastActiveAt ?? reading.createdAt;
        return {
          readingId: reading._id,
          messengerId: reading.messengerId,
          name: fullName(user) ?? null,
          question: reading.question ?? null,
          createdAt: new Date(reading.createdAt).toISOString(),
          hoursSinceLastMessage: Math.round(((Date.now() - lastMessageAt) / 3_600_000) * 10) / 10,
        };
      }),
    );
  },
});

export const replaceInterpretation = internalMutation({
  args: { readingId: v.id("readings"), interpretation: v.string() },
  handler: async (ctx, args) => {
    // conversationHistory[0] keeps the original text as the record of what was sent.
    await ctx.db.patch("readings", args.readingId, { interpretation: args.interpretation, lastActivityAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.embeddings.storeReadingEmbedding, { readingId: args.readingId });
  },
});

/**
 * Writes a real interpretation for a reading that got the fallback text, for the same
 * cards and question, and sends it. `send: false` returns the text without saving or
 * sending. Refuses to send outside Messenger's 24-hour window.
 */
export const redoReading = internalAction({
  args: { readingId: v.id("readings"), send: v.boolean() },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string; interpretation: string }> => {
    const reading = await ctx.runQuery(internal.readings.getById, { readingId: args.readingId as Id<"readings"> });
    if (!reading) throw new Error("Reading not found");
    const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: reading.messengerId });

    const emotion = reading.emotionLabel as EmotionLabel | undefined;
    const interpretation = await generateReading({
      question: reading.question || "What guidance do the cards have for me?",
      cards: reading.cards,
      userName: fullName(user),
      userBirthdate: user?.birthdate,
      emotionTone: emotion ? toneGuidelines(emotion) : undefined,
    });
    if (!args.send) return { sent: false, reason: "dry run", interpretation };

    const lastMessageAt = user?.lastMessageAt ?? user?.lastActiveAt ?? reading.createdAt;
    if (Date.now() - lastMessageAt > DAY_MS) {
      return { sent: false, reason: "outside Messenger's 24-hour window", interpretation };
    }
    const accessToken = getPageAccessToken();
    if (!accessToken) throw new Error("ACCESS_TOKEN is not set");

    await ctx.runMutation(internal.admin.replaceInterpretation, { readingId: reading._id, interpretation });
    const message = `🎴 ${toBoldFont("Here's your full reading")} ✨\n\nYour earlier reading didn't come through properly, so I read your cards again.\n\n${reading.cards
      .map(formatCardSummary)
      .join("\n\n")}\n\n${interpretation}`;
    const sent = await sendText(
      reading.messengerId,
      message,
      accessToken,
      [{ title: "👤 About Me", payload: "About Me" }],
      "UPDATE",
    );
    return { sent, reason: sent ? undefined : "Messenger send failed (see logs)", interpretation };
  },
});
