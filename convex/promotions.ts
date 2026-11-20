// Promotional periods: unlimited daily readings for everyone, some tiers, or some users,
// for a set number of days. Created by hand:
//   npx convex run promotions:createPromotionalPeriod '{"durationDays": 3}'
//
// Messenger only allows standard messages within 24 hours of a user's last message, so
// the start and end announcements go to users who messaged in the last 24 hours.

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { toBoldFont } from "./constants";
import { getPageAccessToken, sendText } from "./lib/messenger";
import { DAY_MS, formatManilaMonthDay } from "./lib/time";

const MESSAGING_WINDOW_MS = DAY_MS;
const BROADCAST_BATCH_SIZE = 20;

export async function findActivePromo(ctx: QueryCtx, now = Date.now()): Promise<Doc<"promotionalPeriods"> | null> {
  const active = await ctx.db
    .query("promotionalPeriods")
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .take(20);
  return active.find((promo) => promo.startDate <= now && promo.endDate >= now) ?? null;
}

export function promoCovers(promo: Doc<"promotionalPeriods">, user: Pick<Doc<"users">, "messengerId" | "userType">): boolean {
  if (!promo.targetedUserIds && !promo.targetedUserTypes) return true;
  if (promo.targetedUserIds?.includes(user.messengerId)) return true;
  return promo.targetedUserTypes?.includes(user.userType) ?? false;
}

export async function isUserEligibleForPromo(ctx: QueryCtx, user: Doc<"users">): Promise<boolean> {
  const promo = await findActivePromo(ctx);
  return promo !== null && promoCovers(promo, user);
}

export const createPromotionalPeriod = internalAction({
  args: {
    durationDays: v.number(),
    targetedUserIds: v.optional(v.array(v.string())),
    targetedUserTypes: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()), // defaults to now
  },
  handler: async (ctx, args): Promise<Id<"promotionalPeriods">> => {
    if (!(args.durationDays > 0)) throw new Error("durationDays must be positive");
    const now = Date.now();
    const startDate = args.startDate ?? now;
    const endDate = startDate + args.durationDays * DAY_MS;

    const promoId: Id<"promotionalPeriods"> = await ctx.runMutation(internal.promotions.insertPromotionalPeriod, {
      startDate,
      endDate,
      targetedUserIds: args.targetedUserIds,
      targetedUserTypes: args.targetedUserTypes,
    });

    if (startDate <= now) {
      await ctx.runAction(internal.promotions.announcePromotion, { promoId, kind: "start" });
    } else {
      await ctx.scheduler.runAt(startDate, internal.promotions.announcePromotion, { promoId, kind: "start" });
    }
    return promoId;
  },
});

export const insertPromotionalPeriod = internalMutation({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    targetedUserIds: v.optional(v.array(v.string())),
    targetedUserTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const active = await ctx.db
      .query("promotionalPeriods")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(20);
    if (active.some((promo) => args.startDate < promo.endDate && args.endDate > promo.startDate)) {
      throw new Error("This overlaps an existing promotional period. Wait for it to end or deactivate it first.");
    }
    const promoId = await ctx.db.insert("promotionalPeriods", { ...args, isActive: true, createdAt: Date.now() });
    const scheduledEndJobId = await ctx.scheduler.runAt(args.endDate, internal.promotions.deactivatePromotionalPeriod, {
      promoId,
    });
    await ctx.db.patch("promotionalPeriods", promoId, { scheduledEndJobId });
    return promoId;
  },
});

export const listPromotionalPeriods = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("promotionalPeriods").order("desc").take(50),
});

export const getPromotion = internalQuery({
  args: { promoId: v.id("promotionalPeriods") },
  handler: async (ctx, args) => await ctx.db.get("promotionalPeriods", args.promoId),
});

/** Returns true if it deactivated the promo, false if it was already inactive. */
export const markPromotionInactive = internalMutation({
  args: { promoId: v.id("promotionalPeriods") },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get("promotionalPeriods", args.promoId);
    if (!promo?.isActive) return false;
    await ctx.db.patch("promotionalPeriods", args.promoId, { isActive: false, deactivatedAt: Date.now() });
    return true;
  },
});

export const deactivatePromotionalPeriod = internalAction({
  args: { promoId: v.id("promotionalPeriods") },
  handler: async (ctx, args) => {
    const changed = await ctx.runMutation(internal.promotions.markPromotionInactive, { promoId: args.promoId });
    if (changed) await ctx.runAction(internal.promotions.announcePromotion, { promoId: args.promoId, kind: "end" });
  },
});

/** Users who messaged in the last 24 hours and are covered by the promo. */
export const listAnnouncementRecipients = internalQuery({
  args: { promoId: v.id("promotionalPeriods") },
  handler: async (ctx, args) => {
    const promo = await ctx.db.get("promotionalPeriods", args.promoId);
    if (!promo) return [];
    const recent = await ctx.db
      .query("users")
      .withIndex("by_last_message", (q) => q.gte("lastMessageAt", Date.now() - MESSAGING_WINDOW_MS))
      .take(5000);
    return recent.filter((user) => promoCovers(promo, user)).map((user) => user.messengerId);
  },
});

export const announcePromotion = internalAction({
  args: { promoId: v.id("promotionalPeriods"), kind: v.union(v.literal("start"), v.literal("end")) },
  handler: async (ctx, args): Promise<void> => {
    const promo = await ctx.runQuery(internal.promotions.getPromotion, { promoId: args.promoId });
    if (!promo) return;
    const accessToken = getPageAccessToken();
    if (!accessToken) {
      console.error("ACCESS_TOKEN is not set; skipping promo announcement");
      return;
    }

    const dateRange = `${formatManilaMonthDay(promo.startDate)} to ${formatManilaMonthDay(promo.endDate)}`;
    const message =
      args.kind === "start"
        ? `🌟 ${toBoldFont("Exclusive Promotional Period Activated!")} ✨

🎴 ${toBoldFont("Premium Access Granted: Unlimited Daily Readings & Follow-up Questions")}

🔮 ${toBoldFont("Promotion Period:")} ${dateRange}
💫 ${toBoldFont("Benefits Include:")}
   • Unlimited daily tarot readings (bypass standard limits)
   • Unlimited follow-up questions for deeper insights
   • Enhanced mystical guidance and cosmic wisdom

May the ancient energies illuminate your path! 🌙`
        : `✨ ${toBoldFont("Promotional Period Concluded")} 🌙

🎴 ${toBoldFont("Premium Access Period Complete:")} ${dateRange}
🔮 ${toBoldFont("Thank you for experiencing enhanced mystical guidance!")}
💫 Your connection with the ancient wisdom continues

${toBoldFont("Standard service limits have been restored.")} Ready to continue your journey with us?

The cards are always here when you need guidance. 🌟`;

    const recipients: string[] = await ctx.runQuery(internal.promotions.listAnnouncementRecipients, { promoId: args.promoId });
    let sent = 0;
    for (let i = 0; i < recipients.length; i += BROADCAST_BATCH_SIZE) {
      const results = await Promise.all(
        recipients
          .slice(i, i + BROADCAST_BATCH_SIZE)
          .map((messengerId) =>
            sendText(messengerId, message, accessToken, [{ title: "🔮 Start My Reading", payload: "Start" }], "UPDATE"),
          ),
      );
      sent += results.filter(Boolean).length;
    }
    console.log(`Promo ${args.kind} announcement: sent ${sent}/${recipients.length}`);
  },
});
