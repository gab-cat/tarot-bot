// "Your daily readings are now available!" sent at the next daily reset (midnight
// UTC, 8:00 AM Manila) to limited users who used up today's readings. The send
// always lands within 24 hours of the user's last message, as Messenger requires.

import { v } from "convex/values";
import { internalAction, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { NOTIFICATION_GREETINGS, QUICK_REPLIES, toBoldFont } from "./constants";
import { getPageAccessToken, sendText } from "./lib/messenger";
import { startOfNextDay } from "./lib/time";

export async function cancelReadingNotification(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  if (!user.scheduledNotificationId) return;
  const job = await ctx.db.system.get("_scheduled_functions", user.scheduledNotificationId);
  if (job?.state.kind === "pending") await ctx.scheduler.cancel(user.scheduledNotificationId);
  await ctx.db.patch("users", user._id, { scheduledNotificationId: undefined });
}

export async function scheduleReadingNotification(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  await cancelReadingNotification(ctx, user);
  const scheduledNotificationId = await ctx.scheduler.runAt(
    startOfNextDay(),
    internal.notifications.sendDailyReadingAvailableNotification,
    { messengerId: user.messengerId },
  );
  await ctx.db.patch("users", user._id, { scheduledNotificationId });
}

export const clearScheduledNotificationId = internalMutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();
    if (user?.scheduledNotificationId) await ctx.db.patch("users", user._id, { scheduledNotificationId: undefined });
  },
});

export const sendDailyReadingAvailableNotification = internalAction({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: args.messengerId });
    if (!user) return;
    await ctx.runMutation(internal.notifications.clearScheduledNotificationId, { messengerId: args.messengerId });
    if (user.userType === "oracle" || user.userType === "pro+") return; // upgraded since

    const accessToken = getPageAccessToken();
    if (!accessToken) {
      console.error("ACCESS_TOKEN is not set; skipping daily notification");
      return;
    }
    const greeting = NOTIFICATION_GREETINGS[Math.floor(Math.random() * NOTIFICATION_GREETINGS.length)];
    const message = `${greeting}\n\n🎴 ${toBoldFont("Your daily readings are now available!")} ✨\n\n🔮 ${toBoldFont("Ask the cards anything that's on your heart today.")}`;
    const sent = await sendText(args.messengerId, message, accessToken, [QUICK_REPLIES.start], "UPDATE");
    if (!sent) console.error("Daily reading notification failed");
  },
});
