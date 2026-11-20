import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { DAY_MS } from "./lib/time";

/**
 * Records a Messenger event and returns true the first time it is seen, false for a
 * retry. Also stamps the sender's lastMessageAt (the start of Messenger's 24-hour
 * messaging window).
 */
export const claim = internalMutation({
  args: { eventKey: v.string(), senderId: v.string(), timestamp: v.number() },
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("webhookEvents")
      .withIndex("by_event_key", (q) => q.eq("eventKey", args.eventKey))
      .first();
    if (seen) return false;
    await ctx.db.insert("webhookEvents", { eventKey: args.eventKey });

    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.senderId))
      .first();
    if (user && (user.lastMessageAt ?? 0) < args.timestamp) {
      await ctx.db.patch("users", user._id, { lastMessageAt: args.timestamp });
    }
    return true;
  },
});

const RETENTION_MS = 7 * DAY_MS;
const PURGE_BATCH = 500;

/** Daily cron. Deletes accepted-event keys older than 7 days, in batches. */
export const purgeOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db
      .query("webhookEvents")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", Date.now() - RETENTION_MS))
      .take(PURGE_BATCH);
    for (const row of old) await ctx.db.delete("webhookEvents", row._id);
    if (old.length === PURGE_BATCH) await ctx.scheduler.runAfter(0, internal.webhookEvents.purgeOld, {});
    return old.length;
  },
});
