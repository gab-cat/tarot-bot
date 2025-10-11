import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { toBoldFont } from "./constants";

// Array of mystical greeting messages for daily reading availability notifications
const MYSTICAL_GREETINGS = [
  "🌙 The cosmic veil lifts once more...",
  "✨ The cards awaken with the new dawn...",
  "🔮 Your mystical journey continues today...",
  "🌟 The stars align for fresh insights...",
  "🎴 The ancient wisdom awaits your touch...",
  "💫 The mystical energies renew themselves...",
  "🌙 A new day brings new revelations...",
  "✨ Your spiritual path calls to you...",
  "🔮 The cards whisper of new beginnings...",
  "🌟 Fresh cosmic guidance awaits..."
];

// Calculate the timestamp for next midnight
function getNextMidnightTimestamp(): number {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime();
}

// Send the daily reading available notification
export const sendDailyReadingAvailableNotification = internalAction({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get user info to check if they still need notification
      const user = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: args.messengerId });

      if (!user) {
        console.warn(`User not found for scheduled notification: ${args.messengerId}`);
        return;
      }

      // Clear the scheduled notification ID first
      await ctx.runMutation(internal.notifications.clearScheduledNotificationId, {
        messengerId: args.messengerId,
      });

      // Check if user still has unlimited readings (they upgraded)
      if (user.userType === "oracle" || user.userType === "pro+") {
        console.log(`Skipping notification for unlimited user: ${args.messengerId}`);
        return;
      }

      // Select a random mystical greeting
      const randomGreeting = MYSTICAL_GREETINGS[Math.floor(Math.random() * MYSTICAL_GREETINGS.length)];

      // Create the notification message with stylized fonts
      const message = `${randomGreeting}

🎴 ${toBoldFont("Your daily readings are now available!")} ✨

🔮 ${toBoldFont("Ask the cards anything that's on your heart today.")}`;

      // Send the notification via Facebook Messenger
      const success = await ctx.runAction(api.facebookApi.sendDailyReadingNotification, {
        messengerId: args.messengerId,
        message,
      });

      if (success) {
        console.log(`✅ Successfully sent daily reading notification to user: ${args.messengerId}`);
      } else {
        console.error(`❌ Failed to send daily reading notification to user: ${args.messengerId}`);
      }
    } catch (error) {
      console.error(`Error sending daily reading notification for user ${args.messengerId}:`, error);
    }
  },
});

// Schedule a notification for when daily readings become available
export const scheduleReadingAvailableNotification = internalMutation({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Cancel any existing scheduled notification
      await ctx.runMutation(internal.notifications.cancelScheduledNotification, {
        messengerId: args.messengerId,
      });

      // Schedule notification in the next midnight
      const nextMidnight = getNextMidnightTimestamp();

      // Schedule the notification
      const scheduledId = await ctx.scheduler.runAt(
        nextMidnight,
        internal.notifications.sendDailyReadingAvailableNotification,
        { messengerId: args.messengerId }
      );

      // Store the scheduled job ID
      await ctx.db.patch(
        (await ctx.db.query("users").withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId)).first())!._id,
        { scheduledNotificationId: scheduledId }
      );

      console.log(`✅ Scheduled daily reading notification for user ${args.messengerId} at ${new Date(nextMidnight).toISOString()}`);
    } catch (error) {
      console.error(`Error scheduling notification for user ${args.messengerId}:`, error);
    }
  },
});

// Cancel any scheduled notification for a user
export const cancelScheduledNotification = internalMutation({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
        .first();

      if (!user || !user.scheduledNotificationId) {
        return; // No scheduled notification to cancel
      }

      // Cancel the scheduled job
      await ctx.scheduler.cancel(user.scheduledNotificationId);

      // Clear the scheduled notification ID
      await ctx.db.patch(user._id, { scheduledNotificationId: undefined });

      console.log(`✅ Cancelled scheduled notification for user ${args.messengerId}`);
    } catch (error) {
      console.error(`Error cancelling scheduled notification for user ${args.messengerId}:`, error);
    }
  },
});

// Clear the scheduled notification ID (used after notification is sent)
export const clearScheduledNotificationId = internalMutation({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
        .first();

      if (user) {
        await ctx.db.patch(user._id, { scheduledNotificationId: undefined });
      }
    } catch (error) {
      console.error(`Error clearing scheduled notification ID for user ${args.messengerId}:`, error);
    }
  },
});

// Migration function to schedule notifications for users who have already used their daily readings today
export const migrateExistingUsersWithLimitReached = internalAction({
  args: {
    dryRun: v.optional(v.boolean()), // If true, only log what would be done without scheduling
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun || false;

    console.log(`🔄 Starting migration to schedule notifications for users who reached daily limit (dryRun: ${dryRun})`);

    // Get all users who are not unlimited (not oracle/pro+)
    const allLimitedUsers = await ctx.runQuery(api.users.getAllLimitedUsers);

    let processed = 0;
    let scheduled = 0;
    let alreadyScheduled = 0;
    let errors = 0;

    // Process users in batches to avoid timeouts
    const batchSize = 10;
    for (let i = 0; i < allLimitedUsers.length; i += batchSize) {
      const batch = allLimitedUsers.slice(i, i + batchSize);

      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allLimitedUsers.length / batchSize)} (${batch.length} users)`);

      // Process each user in the batch
      const batchPromises = batch.map(async (user) => {
        try {
          // Count today's readings for this user
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();

          const todaysReadingCount = await ctx.runQuery(internal.readings.getTodaysReadingCountByUser, {
            userId: user._id,
            startOfDay,
            endOfDay
          });

          // Check if user has reached their limit
          const hasReachedLimit = user.userType === "free"
            ? todaysReadingCount.length >= 1
            : todaysReadingCount.length >= 5; // mystic, pro

          if (!hasReachedLimit) {
            return { status: "not_at_limit", userId: user._id };
          }

          // Check if user already has a scheduled notification
          if (user.scheduledNotificationId) {
            alreadyScheduled++;
            return { status: "already_scheduled", userId: user._id };
          }

          // Schedule notification for next midnight
          if (!dryRun) {
            await ctx.runMutation(internal.notifications.scheduleReadingAvailableNotification, {
              messengerId: user.messengerId,
            });
          }

          scheduled++;
          console.log(`✅ ${dryRun ? 'Would schedule' : 'Scheduled'} notification for user ${user.messengerId} (${todaysReadingCount.length}/${user.userType === "free" ? 1 : 5} readings today)`);

          return { status: "scheduled", userId: user._id };
        } catch (error) {
          console.error(`❌ Error processing user ${user.messengerId}:`, error);
          errors++;
          return { status: "error", userId: user._id, error: error instanceof Error ? error.message : String(error) };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      processed += batchResults.length;

      console.log(`✅ Batch complete: ${batchResults.filter(r => r.status === "scheduled").length} scheduled, ${batchResults.filter(r => r.status === "already_scheduled").length} already scheduled, ${batchResults.filter(r => r.status === "error").length} errors`);
    }

    const result = {
      success: true,
      processed,
      scheduled,
      alreadyScheduled,
      errors,
      dryRun,
      message: `Migration complete: ${scheduled} notifications ${dryRun ? 'would be' : 'were'} scheduled for users who reached their daily limit today`
    };

    console.log(`🎉 Migration complete:`, result);
    return result;
  },
});
