import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { type Doc } from "./_generated/dataModel";

export const createPayment = mutation({
  args: {
    messengerId: v.string(),
    plan: v.union(v.literal("mystic"), v.literal("oracle")),
    externalId: v.string(),
    amount: v.number(),
    currency: v.string(),
    invoiceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      externalId: args.externalId,
      messengerId: args.messengerId,
      plan: args.plan,
      amount: args.amount,
      currency: args.currency,
      status: "PENDING",
      invoiceUrl: args.invoiceUrl,
      createdAt: Date.now(),
    });
  },
});

export const updatePaymentStatus = internalMutation({
  args: {
    externalId: v.string(),
    status: v.optional(v.union(v.literal("PENDING"), v.literal("PAID"), v.literal("EXPIRED"), v.literal("FAILED"))),
    invoiceId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();

    if (!payment) {
      console.error(`Payment not found for externalId: ${args.externalId}`);
      return;
    }

    const updates: Partial<Doc<"payments">> = {};
    if (args.status !== undefined) updates.status = args.status;
    if (args.invoiceId !== undefined) updates.invoiceId = args.invoiceId;
    if (args.paidAt !== undefined) updates.paidAt = args.paidAt;

    await ctx.db.patch(payment._id, updates);
  },
});

export const getPaymentByExternalId = query({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});
