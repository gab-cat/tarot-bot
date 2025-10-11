import { query, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { type Doc, type Id } from "./_generated/dataModel";

// Types for promotional periods
export interface PromotionalPeriod {
  _id: string;
  startDate: number;
  endDate: number;
  targetedUserIds?: string[];
  targetedUserTypes?: string[];
  isActive: boolean;
  createdAt: number;
  deactivatedAt?: number;
  scheduledEndJobId?: string;
}

// Create a new promotional period
export const createPromotionalPeriod = action({
  args: {
    durationDays: v.number(),
    targetedUserIds: v.optional(v.array(v.string())),
    targetedUserTypes: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()), // Optional, defaults to now
  },
  handler: async (ctx, args): Promise<Id<"promotionalPeriods">> => {
    const now = Date.now();
    const startDate = args.startDate || now;
    const endDate = startDate + (args.durationDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds

    // Check for overlapping active promotional periods
    const activePromo = await ctx.runQuery(api.promotions.getActivePromotionalPeriod);

    if (activePromo) {
      // Check if the new promo would overlap with the existing one
      if (startDate < activePromo.endDate && endDate > activePromo.startDate) {
        throw new Error("Cannot create overlapping promotional periods. Please wait for the current promotional period to end.");
      }
    }

    // Create the promotional period
    const promoId: Id<"promotionalPeriods"> = await ctx.runMutation(internal.promotions.createPromotionalPeriodInternal, {
      startDate,
      endDate,
      targetedUserIds: args.targetedUserIds,
      targetedUserTypes: args.targetedUserTypes,
      createdAt: now,
    });

    // Schedule the end notification and deactivation
    const scheduledEndJobId = await ctx.scheduler.runAt(
      endDate,
      internal.promotions.deactivatePromotionalPeriod,
      { promoId }
    );

    // Update the promo with the scheduled job ID
    await ctx.runMutation(internal.promotions.updatePromotionalPeriodJobId, {
      promoId,
      scheduledEndJobId,
    });

    // Send start notifications immediately if the promo starts now
    if (startDate <= now) {
      await ctx.runAction(internal.promotions.sendPromotionalStartNotification, {
        promoId,
        durationDays: args.durationDays,
      });
    } else {
      // Schedule start notification for future promos
      await ctx.scheduler.runAt(
        startDate,
        internal.promotions.sendPromotionalStartNotification,
        {
          promoId,
          durationDays: args.durationDays,
        }
      );
    }

    return promoId;
  },
});

// Get the currently active promotional period
export const getActivePromotionalPeriod = query({
  handler: async (ctx) => {
    const now = Date.now();

    return await ctx.db
      .query("promotionalPeriods")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.lte(q.field("startDate"), now) && q.gte(q.field("endDate"), now))
      .first();
  },
});

// Check if a user is eligible for the current promotional period
export const isUserEligibleForPromo = query({
  args: {
    messengerId: v.string(),
  },
  handler: async (ctx, args) => {
    const activePromo = await ctx.runQuery(api.promotions.getActivePromotionalPeriod);

    if (!activePromo) {
      return false;
    }

    // If no targeting specified, all users are eligible
    if (!activePromo.targetedUserIds && !activePromo.targetedUserTypes) {
      return true;
    }

    // Check targeted user IDs
    if (activePromo.targetedUserIds && activePromo.targetedUserIds.includes(args.messengerId)) {
      return true;
    }

    // Check targeted user types
    if (activePromo.targetedUserTypes) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_messenger_id", (q) => q.eq("messengerId", args.messengerId))
        .first();

      if (user && activePromo.targetedUserTypes.includes(user.userType)) {
        return true;
      }
    }

    return false;
  },
});

// List all promotional periods (for admin/dashboard)
export const listPromotionalPeriods = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("promotionalPeriods")
      .order("desc")
      .collect();
  },
});

// Internal mutation to create a promotional period
export const createPromotionalPeriodInternal = internalMutation({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    targetedUserIds: v.optional(v.array(v.string())),
    targetedUserTypes: v.optional(v.array(v.string())),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promotionalPeriods", {
      startDate: args.startDate,
      endDate: args.endDate,
      targetedUserIds: args.targetedUserIds,
      targetedUserTypes: args.targetedUserTypes,
      isActive: true,
      createdAt: args.createdAt,
    });
  },
});

// Internal mutation to update promotional period job ID
export const updatePromotionalPeriodJobId = internalMutation({
  args: {
    promoId: v.id("promotionalPeriods"),
    scheduledEndJobId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.promoId, {
      scheduledEndJobId: args.scheduledEndJobId,
    });
  },
});

// Internal mutation to deactivate a promotional period
export const deactivatePromotionalPeriodInternal = internalMutation({
  args: {
    promoId: v.id("promotionalPeriods"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.promoId, {
      isActive: false,
      deactivatedAt: Date.now(),
    });
  },
});

// Internal action to deactivate a promotional period
export const deactivatePromotionalPeriod = internalAction({
  args: {
    promoId: v.id("promotionalPeriods"),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.runQuery(internal.promotions.getPromotionByIdInternal, { promoId: args.promoId });

    if (!promo || !promo.isActive) {
      return;
    }

    // Mark as inactive
    await ctx.runMutation(internal.promotions.deactivatePromotionalPeriodInternal, {
      promoId: args.promoId,
    });

    // Send end notifications
    await ctx.runAction(internal.promotions.sendPromotionalEndNotification, {
      promoId: args.promoId,
    });
  },
});

// Internal action to send promotional start notifications
export const sendPromotionalStartNotification = internalAction({
  args: {
    promoId: v.id("promotionalPeriods"),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.runQuery(internal.promotions.getPromotionByIdInternal, { promoId: args.promoId });

    if (!promo) {
      console.warn(`Promotional period ${args.promoId} not found for start notification`);
      return;
    }

    // Get users to notify
    let usersToNotify: string[] = [];

    if (promo.targetedUserIds) {
      usersToNotify = promo.targetedUserIds;
    } else if (promo.targetedUserTypes) {
      // Get users by type
      const users = await ctx.runQuery(internal.promotions.getUsersByTypes, {
        userTypes: promo.targetedUserTypes,
      });
      usersToNotify = users.map((u: Doc<"users">) => u.messengerId);
    } else {
      // All users
      const users = await ctx.runQuery(internal.promotions.getAllUsers);
      usersToNotify = users.map((u: Doc<"users">) => u.messengerId);
    }

    // Create notification message
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    const message = `🌟 ${toBoldFont("Exclusive Promotional Period Activated!")} ✨

🎴 ${toBoldFont("Premium Access Granted: Unlimited Daily Readings & Follow-up Questions")}

🔮 ${toBoldFont("Promotion Period:")} ${dateRange}
💫 ${toBoldFont("Benefits Include:")}
   • Unlimited daily tarot readings (bypass standard limits)
   • Unlimited follow-up questions for deeper insights
   • Enhanced mystical guidance and cosmic wisdom

May the ancient energies illuminate your path! 🌙`;

    // Send notifications to all eligible users
    const notificationPromises = usersToNotify.map(messengerId =>
      ctx.runAction(api.facebookApi.sendDailyReadingNotification, {
        messengerId,
        message,
      })
    );

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === "fulfilled").length;

    console.log(`✅ Sent promotional start notifications to ${successCount}/${usersToNotify.length} users`);
  },
});

// Internal action to send promotional end notifications
export const sendPromotionalEndNotification = internalAction({
  args: {
    promoId: v.id("promotionalPeriods"),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.runQuery(internal.promotions.getPromotionByIdInternal, { promoId: args.promoId });

    if (!promo) {
      console.warn(`Promotional period ${args.promoId} not found for end notification`);
      return;
    }

    // Get users to notify
    let usersToNotify: string[] = [];

    if (promo.targetedUserIds) {
      usersToNotify = promo.targetedUserIds;
    } else if (promo.targetedUserTypes) {
      const users = await ctx.runQuery(internal.promotions.getUsersByTypes, {
        userTypes: promo.targetedUserTypes,
      });
      usersToNotify = users.map((u: Doc<"users">) => u.messengerId);
    } else {
      const users = await ctx.runQuery(internal.promotions.getAllUsers);
      usersToNotify = users.map((u: Doc<"users">) => u.messengerId);
    }

    // Create notification message
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    const message = `✨ ${toBoldFont("Promotional Period Concluded")} 🌙

🎴 ${toBoldFont("Premium Access Period Complete:")} ${dateRange}
🔮 ${toBoldFont("Thank you for experiencing enhanced mystical guidance!")}
💫 Your connection with the ancient wisdom continues

${toBoldFont("Standard service limits have been restored.")} Ready to continue your journey with us?

The cards are always here when you need guidance. 🌟`;

    // Send notifications to all eligible users
    const notificationPromises = usersToNotify.map(messengerId =>
      ctx.runAction(api.facebookApi.sendDailyReadingNotification, {
        messengerId,
        message,
      })
    );

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === "fulfilled").length;

    console.log(`✅ Sent promotional end notifications to ${successCount}/${usersToNotify.length} users`);
  },
});

// Internal query to get a promotion by ID
export const getPromotionByIdInternal = internalQuery({
  args: {
    promoId: v.id("promotionalPeriods"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.promoId);
  },
});

// Internal query to get all users
export const getAllUsers = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Internal query to get users by types
export const getUsersByTypes = internalQuery({
  args: {
    userTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter(user => args.userTypes.includes(user.userType));
  },
});

// Helper function to convert text to bold font (imported from constants)
function toBoldFont(text: string): string {
  const BOLD_FONT_MAP = {
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
    'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
    'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
    'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
    'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  } as const;

  return text.split('').map(char => BOLD_FONT_MAP[char as keyof typeof BOLD_FONT_MAP] || char).join('');
}
