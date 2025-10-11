import { mutation, query, internalMutation, internalAction, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { type Doc } from "./_generated/dataModel";
import { toBoldFont } from "./constants";

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
        userType: "free",
        createdAt: now,
        lastActiveAt: now,
        followupSessionsToday: 0,
      });
    }
  },
});

export const getUserByMessengerId = query({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();
  },
});

export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getAllLimitedUsers = query({
  handler: async (ctx) => {
    // Return all users who have limited readings (not oracle/pro+)
    return await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("userType"), "oracle"),
          q.neq(q.field("userType"), "pro+")
        )
      )
      .collect();
  },
});

export const getLastReadings = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    return await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

export const getTodaysReadingCount = query({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (!user) return 0;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();

    const readings = await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("createdAt"), startOfDay) && q.lt(q.field("createdAt"), endOfDay))
      .collect();

    return readings.length;
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

    // Oracle/pro+ users have unlimited readings
    if (user.userType === "oracle" || user.userType === "pro+") return true;

    // Check for active promotional period
    const promoEligible = await ctx.runQuery(api.promotions.isUserEligibleForPromo, {
      messengerId: args.messengerId
    });
    if (promoEligible) return true;

    // Count today's readings
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();

    const todaysReadingCount = await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("createdAt"), startOfDay) && q.lt(q.field("createdAt"), endOfDay))
      .collect();

    // Check limits based on user type
    if (user.userType === "free") {
      return todaysReadingCount.length < 1;
    } else if (user.userType === "mystic" || user.userType === "pro") {
      return todaysReadingCount.length < 5;
    }

    // Default to free limits if userType is invalid
    return todaysReadingCount.length < 1;
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
        userType: "free",
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        lastReadingDate: Date.now(),
        sessionState: "reading_complete", // Set to reading complete state instead of ending immediately
        followupSessionsToday: 0,
      });
    } else {
      // Update existing user
      await ctx.db.patch(user._id, {
        lastReadingDate: Date.now(),
        lastActiveAt: Date.now(),
        sessionState: "reading_complete", // Set to reading complete state instead of ending immediately
      });
    }

    // Schedule session end after 5 seconds
    await ctx.scheduler.runAfter(5000, internal.users.endSession, {
      messengerId: args.messengerId,
    });
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
        userType: "free",
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        sessionState: "waiting_question",
        followupSessionsToday: 0,
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

export const setReadingInProgress = mutation({
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
        lastActiveAt: Date.now(),
        sessionState: "reading_in_progress",
      });
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

    // First check user's session state
    const userSessionState = user?.sessionState;
    
    // If user has an active session state (not followup-related), return it
    if (userSessionState && userSessionState !== "reading_complete") {
      return userSessionState;
    }

    // Check if there's an active followup session in the most recent reading
    if (user) {
      const recentReadings = await ctx.db
        .query("readings")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(1);

      if (recentReadings.length > 0) {
        const latestReading = recentReadings[0];
        // If reading has followup state, return it
        if (latestReading.sessionState === "followup_available" || 
            latestReading.sessionState === "followup_in_progress") {
          return latestReading.sessionState;
        }
      }
    }

    return userSessionState || null;
  },
});

export const endSession = internalMutation({
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

export const updateUserDescription = mutation({
  args: {
    messengerId: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        description: args.description,
        descriptionLastUpdated: Date.now(),
      });
    }
  },
});

export const updateUserBirthdate = mutation({
  args: {
    messengerId: v.string(),
    birthdate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        birthdate: args.birthdate,
        lastActiveAt: Date.now(),
      });
    }
  },
});

export const updateFollowupTracking = mutation({
  args: {
    messengerId: v.string(),
    lastFollowupAt: v.optional(v.number()),
    followupSessionsToday: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (user) {
      const updates: Partial<Doc<"users">> = { lastActiveAt: Date.now() };

      if (args.lastFollowupAt !== undefined) {
        updates.lastFollowupAt = args.lastFollowupAt;
      }

      if (args.followupSessionsToday !== undefined) {
        updates.followupSessionsToday = (user.followupSessionsToday || 0) + 1;
      }

      await ctx.db.patch(user._id, updates);
    }
  },
});

export const setWaitingBirthdate = mutation({
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
        lastActiveAt: Date.now(),
        sessionState: "waiting_birthdate",
      });
    } else {
      return await ctx.db.insert("users", {
        messengerId: args.messengerId,
        isSubscribed: true,
        userType: "free",
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        sessionState: "waiting_birthdate",
        followupSessionsToday: 0,
      });
    }
  },
});

// Utility function to validate birthdate format
export function validateBirthdate(birthdate: string): boolean {
  // Expected format: "Month DD" (e.g., "Oct 15", "Dec 2")
  const birthdateRegex = /^[A-Za-z]{3} \d{1,2}$/;
  if (!birthdateRegex.test(birthdate.trim())) {
    return false;
  }

  const [monthStr, dayStr] = birthdate.trim().split(' ');
  const day = parseInt(dayStr, 10);

  // Validate month
  const validMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!validMonths.includes(monthStr)) {
    return false;
  }

  // Validate day (1-31, but we'll do basic validation)
  return day >= 1 && day <= 31;
}

export const generateUserProfileMessage = action({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const user = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: args.messengerId });

    if (!user) {
      return `👤 ${toBoldFont("About You")}\n\nI don't have information about you yet. Start a reading to begin your mystical journey! 🔮`;
    }

    const userName = user.firstName || user.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : "Mystical Seeker";

    // Get user type display name
    const userTypeDisplayMap: Record<string, string> = {
      free: "Free Explorer",
      mystic: "Mystic Guide",
      oracle: "Oracle Master",
      pro: "Mystic Guide", // Backward compatibility
      "pro+": "Oracle Master" // Backward compatibility
    };
    const userTypeDisplay = userTypeDisplayMap[user.userType] || "Free Explorer";

    // Get last 5 readings
    const lastReadings = await ctx.runQuery(api.users.getLastReadings, {
      userId: user._id,
      limit: 5
    });

    // Check if we need to regenerate description (every 15 days)
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const needsNewDescription = !user.description ||
                               !user.descriptionLastUpdated ||
                               (now - user.descriptionLastUpdated) > FIFTEEN_DAYS_MS;

    let description = user.description || "";

    // Generate new AI description if needed and there are readings
    if (needsNewDescription && lastReadings.length > 0) {
      const { generateUserDescription } = await import("./tarot");
      description = await generateUserDescription(lastReadings, userName);

      // Save the new description
      await ctx.runMutation(api.users.updateUserDescription, {
        messengerId: args.messengerId,
        description,
      });
    } else if (!description) {
      // Fallback for users without readings or saved description
      description = "A curious soul beginning their journey into the mystical arts, ready to discover the wisdom the cards hold.";
    }

    // Create upgrade message for free users
    const upgradeMessage = user.userType === "free"
      ? `\n\n🌟 ${toBoldFont("Upgrade to Mystic Guide")} for 5 daily readings and deeper insights!\n💎 ${toBoldFont("Upgrade to Oracle Master")} for unlimited readings and premium mystical guidance!`
      : "";

    return `👤 ${toBoldFont(`About ${userName}`)}

${toBoldFont("Spiritual Level:")} ${userTypeDisplay}
${toBoldFont("Readings Completed:")} ${lastReadings.length}

${toBoldFont("Your Mystical Essence:")}
${description}${upgradeMessage}`;
  },
});

export const upgradeUserType = internalMutation({
  args: {
    messengerId: v.string(),
    newType: v.union(v.literal("mystic"), v.literal("oracle")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (!user) {
      console.error(`User not found for messengerId: ${args.messengerId}`);
      return;
    }

    await ctx.db.patch(user._id, {
      userType: args.newType,
      isSubscribed: true,
      lastActiveAt: Date.now(),
    });

    // Cancel any scheduled daily reading notifications since oracle users have unlimited readings
    if (args.newType === "oracle") {
      await ctx.runMutation(internal.notifications.cancelScheduledNotification, {
        messengerId: args.messengerId,
      });
    }
  },
});

/**
 * INTERNAL: Migrate existing users without names to fetch and save their profile info
 * This function can be run manually or as a background job to backfill user data
 */
export const migrateUserProfiles = internalAction({
  args: {
    batchSize: v.optional(v.number()), // How many users to process at once (default: 10)
    dryRun: v.optional(v.boolean()), // If true, only log what would be done without making changes
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;
    const dryRun = args.dryRun || false;

    console.log(`🔄 Starting user profile migration (batchSize: ${batchSize}, dryRun: ${dryRun})`);

    // Find users without firstName and lastName
    const usersWithoutNames = await ctx.runQuery(internal.users.getUsersWithoutNames);

    console.log(`📊 Found ${usersWithoutNames.length} users without profile information`);

    if (usersWithoutNames.length === 0) {
      console.log("✅ No users need migration");
      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        message: "No users need migration"
      };
    }

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Process users in batches
    const batches = [];
    for (let i = 0; i < usersWithoutNames.length; i += batchSize) {
      batches.push(usersWithoutNames.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      console.log(`📦 Processing batch of ${batch.length} users...`);

      // Process each user in the batch
      const batchPromises = batch.map(async (user) => {
        try {
          console.log(`🔍 Processing user ${user.messengerId}...`);

          // Try to fetch user profile using the standard approach
          const userProfile = await ctx.runAction(api.facebookApi.getUserProfile, {
            userId: user.messengerId,
            accessToken: process.env.ACCESS_TOKEN!,
          });

          // If standard approach fails, this is likely a phone-registered user
          // We can't migrate them automatically since we don't have their message_id
          if (!userProfile) {
            console.warn(`⚠️ Cannot fetch profile for user ${user.messengerId} (likely phone-registered)`);
            failed++;
            return { userId: user._id, success: false, reason: "Cannot fetch profile (phone-registered)" };
          }

          console.log(`✅ Successfully fetched profile for user ${user.messengerId}:`, {
            has_first_name: !!userProfile.first_name,
            has_last_name: !!userProfile.last_name,
          });

          if (!dryRun) {
            // Update the user with the fetched profile information
            await ctx.runMutation(internal.users.updateUserProfile, {
              messengerId: user.messengerId,
              firstName: userProfile.first_name,
              lastName: userProfile.last_name,
            });
          }

          successful++;
          return { userId: user._id, success: true, profile: userProfile };
        } catch (error) {
          console.error(`❌ Error processing user ${user.messengerId}:`, error);
          failed++;
          return { userId: user._id, success: false, error: error instanceof Error ? error.message : String(error) };
        }
      });

      // Wait for all users in this batch to be processed
      const batchResults = await Promise.all(batchPromises);
      processed += batchResults.length;

      console.log(`✅ Batch complete: ${batchResults.filter(r => r.success).length} successful, ${batchResults.filter(r => !r.success).length} failed`);
    }

    const result = {
      success: true,
      processed,
      successful,
      failed,
      message: `Migration complete: ${successful}/${processed} users updated successfully`,
      dryRun
    };

    console.log(`🎉 Migration complete:`, result);
    return result;
  },
});

/**
 * INTERNAL: Query to find users without firstName and lastName
 */
export const getUsersWithoutNames = internalQuery({
  handler: async (ctx) => {
    // Find users where both firstName and lastName are missing/empty
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("firstName"), undefined), q.eq(q.field("firstName"), "")),
          q.or(q.eq(q.field("lastName"), undefined), q.eq(q.field("lastName"), ""))
        )
      )
      .collect();

    return users.map(user => ({
      _id: user._id,
      messengerId: user.messengerId,
      createdAt: user._creationTime
    }));
  },
});

/**
 * INTERNAL: Update user profile information
 */
export const updateUserProfile = internalMutation({
  args: {
    messengerId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.messengerId}`);
    }

    const updates: Partial<Doc<"users">> = {};
    if (args.firstName !== undefined) {
      updates.firstName = args.firstName;
    }
    if (args.lastName !== undefined) {
      updates.lastName = args.lastName;
    }

    await ctx.db.patch(user._id, updates);

    console.log(`✅ Updated profile for user ${args.messengerId}:`, updates);
  },
});
