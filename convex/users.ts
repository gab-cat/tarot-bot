import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  DEFAULT_PROFILE_DESCRIPTION,
  FREE_READINGS_PER_DAY,
  MYSTIC_READINGS_PER_DAY,
  SUBSCRIPTION_DAYS,
  TIER_DISPLAY_NAMES,
  toBoldFont,
} from "./constants";
import { DAY_MS, formatManilaDate, startOfDay } from "./lib/time";
import { fullName } from "./lib/text";
import { fetchUserProfile, getPageAccessToken } from "./lib/messenger";
import { generateProfileDescription } from "./ai/gemini";
import { isUserEligibleForPromo } from "./promotions";
import { cancelReadingNotification } from "./notifications";
import { userSessionStateValidator, type UserTier } from "./validators";

// Helpers -----------------------------------------------------------------------

export async function findUser(ctx: QueryCtx, messengerId: string): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_messenger_id", (q) => q.eq("messengerId", messengerId))
    .first();
}

async function findOrCreateUser(ctx: MutationCtx, messengerId: string): Promise<Doc<"users">> {
  const existing = await findUser(ctx, messengerId);
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("users", {
    messengerId,
    isSubscribed: true,
    userType: "free",
    createdAt: now,
    lastActiveAt: now,
    lastMessageAt: now, // users are only ever created while answering their message
    readingCount: 0,
  });
  return (await ctx.db.get("users", id))!;
}

export function isUnlimited(tier: UserTier): boolean {
  return tier === "oracle" || tier === "pro+";
}

export function dailyReadingLimit(tier: UserTier): number {
  if (isUnlimited(tier)) return Infinity;
  return tier === "mystic" || tier === "pro" ? MYSTIC_READINGS_PER_DAY : FREE_READINGS_PER_DAY;
}

/** Readings since the daily reset, reading at most `limit` rows. */
export async function countReadingsToday(ctx: QueryCtx, userId: Id<"users">, limit: number, now = Date.now()): Promise<number> {
  const recent = await ctx.db
    .query("readings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);
  const since = startOfDay(now);
  return recent.filter((reading) => reading.createdAt >= since).length;
}

async function canRead(ctx: QueryCtx, user: Doc<"users"> | null): Promise<boolean> {
  if (!user) return true;
  const limit = dailyReadingLimit(user.userType);
  if (limit === Infinity) return true;
  if (await isUserEligibleForPromo(ctx, user)) return true;
  return (await countReadingsToday(ctx, user._id, limit)) < limit;
}

// Reads -------------------------------------------------------------------------

const STALE_READING_MS = 5 * 60 * 1000;

export const getUserByMessengerId = internalQuery({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => await findUser(ctx, args.messengerId),
});

export const canReadToday = internalQuery({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => await canRead(ctx, await findUser(ctx, args.messengerId)),
});

/**
 * The user's conversation state. Follow-up state lives on the latest reading, so it
 * wins when the user has no state of their own (or only "reading_complete").
 */
export const getSessionState = internalQuery({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.messengerId);
    if (!user) return null;
    // A reading that crashed or was cut off by a deploy must not lock the user out.
    if (user.sessionState === "reading_in_progress" && user.lastActiveAt < Date.now() - STALE_READING_MS) return null;
    if (user.sessionState && user.sessionState !== "reading_complete") return user.sessionState;

    const latest = await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (latest && (latest.sessionState === "followup_available" || latest.sessionState === "followup_in_progress")) {
      return latest.sessionState;
    }
    return user.sessionState ?? null;
  },
});

// Session state -----------------------------------------------------------------

export const setSessionState = internalMutation({
  args: { messengerId: v.string(), sessionState: v.optional(userSessionStateValidator) },
  handler: async (ctx, args) => {
    const user = await findOrCreateUser(ctx, args.messengerId);
    await ctx.db.patch("users", user._id, { sessionState: args.sessionState, lastActiveAt: Date.now() });
  },
});

export const endSession = internalMutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.messengerId);
    if (user) {
      await ctx.db.patch("users", user._id, { sessionState: undefined, pendingQuestion: undefined, lastActiveAt: Date.now() });
    }
  },
});

/**
 * Claims the reading: moves waiting_question to reading_in_progress in one
 * transaction. Returns false if another message already claimed it.
 */
export const beginReading = internalMutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.messengerId);
    if (!user || user.sessionState !== "waiting_question") return false;
    await ctx.db.patch("users", user._id, { sessionState: "reading_in_progress", lastActiveAt: Date.now() });
    return true;
  },
});

/** Keeps a question asked before the birthdate and asks for the birthdate. */
export const holdQuestionForBirthdate = internalMutation({
  args: { messengerId: v.string(), question: v.string() },
  handler: async (ctx, args) => {
    const user = await findOrCreateUser(ctx, args.messengerId);
    await ctx.db.patch("users", user._id, {
      pendingQuestion: args.question.slice(0, 2000),
      sessionState: "waiting_birthdate",
      lastActiveAt: Date.now(),
    });
  },
});

/** Saves the birthdate, moves to waiting_question and hands back any held question. */
export const acceptBirthdate = internalMutation({
  args: { messengerId: v.string(), birthdate: v.string() },
  handler: async (ctx, args) => {
    const user = await findOrCreateUser(ctx, args.messengerId);
    await ctx.db.patch("users", user._id, {
      birthdate: args.birthdate,
      sessionState: "waiting_question",
      pendingQuestion: undefined,
      lastActiveAt: Date.now(),
    });
    return user.pendingQuestion ?? null;
  },
});

/** After a failed reading: let the user resend the same question. */
export const reopenQuestion = internalMutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.messengerId);
    if (user && user.sessionState === "reading_in_progress") {
      await ctx.db.patch("users", user._id, { sessionState: "waiting_question" });
    }
  },
});

export const markReadingDone = internalMutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await findOrCreateUser(ctx, args.messengerId);
    const now = Date.now();
    await ctx.db.patch("users", user._id, { lastReadingDate: now, lastActiveAt: now, sessionState: "reading_complete" });
    // Short cool-down so a double tap doesn't start a second reading.
    await ctx.scheduler.runAfter(5000, internal.users.clearReadingComplete, { messengerId: args.messengerId });
  },
});

/** Only clears "reading_complete", so it can't wipe a session the user started since. */
export const clearReadingComplete = internalMutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.messengerId);
    if (user?.sessionState === "reading_complete") {
      await ctx.db.patch("users", user._id, { sessionState: undefined });
    }
  },
});

// Profile -----------------------------------------------------------------------

/** Saves Facebook profile fields. Missing fields never overwrite what we have. */
export const saveProfile = internalMutation({
  args: { messengerId: v.string(), firstName: v.optional(v.string()), lastName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await findOrCreateUser(ctx, args.messengerId);
    const updates: Partial<Doc<"users">> = { lastActiveAt: Date.now() };
    if (args.firstName) updates.firstName = args.firstName;
    if (args.lastName) updates.lastName = args.lastName;
    await ctx.db.patch("users", user._id, updates);
    return user._id;
  },
});

export const saveBirthdate = internalMutation({
  args: { messengerId: v.string(), birthdate: v.string() },
  handler: async (ctx, args) => {
    const user = await findOrCreateUser(ctx, args.messengerId);
    await ctx.db.patch("users", user._id, { birthdate: args.birthdate, lastActiveAt: Date.now() });
  },
});

export const saveDescription = internalMutation({
  args: { userId: v.id("users"), description: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch("users", args.userId, { description: args.description, descriptionLastUpdated: Date.now() });
  },
});

export const updateLastEmotion = internalMutation({
  args: { messengerId: v.string(), emotionLabel: v.string() },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.messengerId);
    if (user) await ctx.db.patch("users", user._id, { lastEmotionLabel: args.emotionLabel, lastEmotionAt: Date.now() });
  },
});

/** Old rows have no readingCount. Counts once and stores it. */
export const ensureReadingCount = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return 0;
    if (user.readingCount !== undefined) return user.readingCount;
    const readings = await ctx.db
      .query("readings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    await ctx.db.patch("users", args.userId, { readingCount: readings.length });
    return readings.length;
  },
});

const DESCRIPTION_MAX_AGE_MS = 15 * DAY_MS;

/** The "About me" message. */
export async function buildProfileMessage(ctx: ActionCtx, messengerId: string): Promise<string> {
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId });
  if (!user) {
    return `👤 ${toBoldFont("About You")}\n\nI don't have information about you yet. Start a reading to begin your mystical journey! 🔮`;
  }

  const userName = fullName(user) ?? "Mystical Seeker";
  const now = Date.now();
  const readingCount = user.readingCount ?? (await ctx.runMutation(internal.users.ensureReadingCount, { userId: user._id }));

  let subscriptionDetails = "";
  if (user.userType !== "free" && user.subscriptionStartAt && user.subscriptionExpiresAt) {
    const daysRemaining = Math.max(0, Math.ceil((user.subscriptionExpiresAt - now) / DAY_MS));
    subscriptionDetails = `\n\n${toBoldFont("Subscription Details:")}\nStarted: ${formatManilaDate(user.subscriptionStartAt)}\nExpires: ${formatManilaDate(user.subscriptionExpiresAt)}\nDays remaining: ${daysRemaining}`;
  }

  let description = user.description ?? "";
  const isStale = !user.descriptionLastUpdated || now - user.descriptionLastUpdated > DESCRIPTION_MAX_AGE_MS;
  if ((!description || isStale) && readingCount > 0) {
    const recent = await ctx.runQuery(internal.readings.listRecentForUser, { userId: user._id, limit: 5 });
    try {
      description = await generateProfileDescription({ userName: fullName(user), readings: recent });
      await ctx.runMutation(internal.users.saveDescription, { userId: user._id, description });
    } catch (error) {
      console.warn("Profile description failed; keeping the old one", error);
    }
  }
  if (!description) description = DEFAULT_PROFILE_DESCRIPTION;

  const upgradeMessage =
    user.userType === "free"
      ? `\n\n🌟 ${toBoldFont("Upgrade to Mystic Guide")} for 5 daily readings and deeper insights!\n💎 ${toBoldFont("Upgrade to Oracle Master")} for unlimited readings and premium mystical guidance!`
      : "";

  return `👤 ${toBoldFont(`About ${userName}`)}

${toBoldFont("Spiritual Level:")} ${TIER_DISPLAY_NAMES[user.userType] ?? "Free Explorer"}
${toBoldFont("Readings Completed:")} ${readingCount}${subscriptionDetails}

${toBoldFont("Your Mystical Essence:")}
${description}${upgradeMessage}`;
}

// Subscriptions -----------------------------------------------------------------

/**
 * Upgrades a free user for 30 days and schedules the downgrade. Returns false and
 * changes nothing if the user is missing or already on a paid tier.
 */
export async function activateSubscription(ctx: MutationCtx, messengerId: string, plan: "mystic" | "oracle"): Promise<boolean> {
  const user = await findUser(ctx, messengerId);
  if (!user) {
    console.error("activateSubscription: user not found");
    return false;
  }
  if (user.userType !== "free") {
    console.error(`activateSubscription: user is already ${user.userType}; payment needs a manual decision`);
    return false;
  }

  const now = Date.now();
  const expiresAt = now + SUBSCRIPTION_DAYS * DAY_MS;
  const scheduledDowngradeId = await ctx.scheduler.runAt(expiresAt, internal.users.downgradeToFree, { messengerId });
  await ctx.db.patch("users", user._id, {
    userType: plan,
    isSubscribed: true,
    lastActiveAt: now,
    subscriptionStartAt: now,
    subscriptionExpiresAt: expiresAt,
    scheduledDowngradeId,
  });
  await setTierOnOpenReadings(ctx, user._id, plan);
  if (plan === "oracle") await cancelReadingNotification(ctx, user);
  return true;
}

async function setTierOnOpenReadings(ctx: MutationCtx, userId: Id<"users">, tier: UserTier): Promise<void> {
  const recent = await ctx.db
    .query("readings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(5);
  for (const reading of recent) {
    if (
      reading.sessionState === "active" ||
      reading.sessionState === "followup_available" ||
      reading.sessionState === "followup_in_progress"
    ) {
      await ctx.db.patch("readings", reading._id, { subscriptionTier: tier });
    }
  }
}

/**
 * Runs from the scheduler when a subscription expires. It must not cancel
 * scheduledDowngradeId: that is this job, and since Convex 1.50 a scheduled
 * mutation cancelling itself throws and rolls back.
 */
export const downgradeToFree = internalMutation({
  args: { messengerId: v.string() },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.messengerId);
    if (!user) return;
    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt > Date.now() + 60_000) {
      // A later subscription replaced the one this job was scheduled for.
      return;
    }
    await ctx.db.patch("users", user._id, {
      userType: "free",
      isSubscribed: false,
      lastActiveAt: Date.now(),
      subscriptionStartAt: undefined,
      subscriptionExpiresAt: undefined,
      scheduledDowngradeId: undefined,
    });
    await setTierOnOpenReadings(ctx, user._id, "free");
  },
});

// One-off migrations (run with `npx convex run`) ---------------------------------

/**
 * Backfills subscription dates for paid users from before subscriptions expired.
 * Idempotent: only touches paid users with no subscription dates.
 */
export const migrateExistingSubscriptions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const paid = [
      ...(await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userType"), "mystic"))
        .collect()),
      ...(await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userType"), "oracle"))
        .collect()),
    ].filter((user) => user.subscriptionStartAt === undefined || user.subscriptionExpiresAt === undefined);

    const now = Date.now();
    const expiresAt = now + SUBSCRIPTION_DAYS * DAY_MS;
    for (const user of paid) {
      const scheduledDowngradeId = await ctx.scheduler.runAt(expiresAt, internal.users.downgradeToFree, {
        messengerId: user.messengerId,
      });
      await ctx.db.patch("users", user._id, {
        subscriptionStartAt: now,
        subscriptionExpiresAt: expiresAt,
        scheduledDowngradeId,
        lastActiveAt: now,
      });
    }
    return { migratedCount: paid.length };
  },
});

/** Users with no name stored, for `migrateUserProfiles`. */
export const listUsersWithoutNames = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((user) => !user.firstName && !user.lastName).map((user) => ({ messengerId: user.messengerId }));
  },
});

/**
 * Tries to fill in names for users who have none. See docs/MIGRATION_GUIDE.md.
 * `npx convex run users:migrateUserProfiles '{"dryRun": true}'`
 */
export const migrateUserProfiles = internalAction({
  args: { batchSize: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<{ processed: number; successful: number; failed: number; dryRun: boolean }> => {
    const accessToken = getPageAccessToken();
    if (!accessToken) throw new Error("ACCESS_TOKEN is not set");

    const batchSize = args.batchSize ?? 10;
    const dryRun = args.dryRun ?? false;
    const users: Array<{ messengerId: string }> = await ctx.runQuery(internal.users.listUsersWithoutNames, {});
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      await Promise.all(
        users.slice(i, i + batchSize).map(async (user) => {
          const profile = await fetchUserProfile(user.messengerId, accessToken);
          if (!profile?.first_name && !profile?.last_name) {
            failed++;
            return;
          }
          if (!dryRun) {
            await ctx.runMutation(internal.users.saveProfile, {
              messengerId: user.messengerId,
              firstName: profile.first_name,
              lastName: profile.last_name,
            });
          }
          successful++;
        }),
      );
    }
    return { processed: users.length, successful, failed, dryRun };
  },
});
