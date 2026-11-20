// Xendit invoices for the Mystic and Oracle plans (PHP, 30 days).
// Flow: Messenger quick reply UPGRADE_* -> startCheckout creates the invoice and sends
// the link -> Xendit calls POST /xendit/webhook -> markPaid upgrades the user.

import { v } from "convex/values";
import { Xendit } from "xendit-node";
import { internalMutation, query, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { MESSAGES, PAYMENT_CARD_IMAGE_URL, PLAN_NAMES, PRICES_PHP, QUICK_REPLIES } from "./constants";
import { sendLinkCard, sendText } from "./lib/messenger";
import { capitalize } from "./lib/text";
import { activateSubscription, buildProfileMessage, findUser } from "./users";
import { paidPlanValidator, type PaidPlan } from "./validators";

function xenditInvoices() {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) throw new Error("XENDIT_SECRET_KEY is not set");
  return new Xendit({ secretKey }).Invoice;
}

/** Public: the /xendit/success page reads this. Returns only what the page shows. */
export const getPaymentByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
    if (!payment) return null;
    const { status, plan, amount, currency, createdAt, paidAt } = payment;
    return { status, plan, amount, currency, createdAt, paidAt };
  },
});

export const recordInvoice = internalMutation({
  args: {
    externalId: v.string(),
    messengerId: v.string(),
    plan: paidPlanValidator,
    amount: v.number(),
    currency: v.string(),
    invoiceId: v.optional(v.string()),
    invoiceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("payments", { ...args, status: "PENDING", createdAt: Date.now() });
  },
});

/** Creates an invoice and sends the payment link. Only free users can check out. */
export async function startCheckout(
  ctx: ActionCtx,
  accessToken: string,
  args: { messengerId: string; plan: PaidPlan },
): Promise<void> {
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: args.messengerId });
  if (user && user.userType !== "free") {
    const profile = await buildProfileMessage(ctx, args.messengerId);
    await sendText(args.messengerId, `${profile}\n\n${MESSAGES.upgradeAlreadySubscribed}`, accessToken, [
      QUICK_REPLIES.aboutMe,
      QUICK_REPLIES.startReading,
    ]);
    return;
  }

  const amount = PRICES_PHP[args.plan];
  const planLabel = capitalize(args.plan);
  const externalId = `tb-${args.plan}-${args.messengerId}-${Date.now()}`;

  try {
    const redirectBase = process.env.REDIRECT_URL;
    if (!redirectBase) throw new Error("REDIRECT_URL is not set");
    const invoice = await xenditInvoices().createInvoice({
      data: {
        externalId,
        amount,
        currency: "PHP",
        description: `Upgrade to ${planLabel} Plan`,
        successRedirectUrl: `${redirectBase}/xendit/success?external_id=${encodeURIComponent(externalId)}`,
        failureRedirectUrl: `${redirectBase}/xendit/failure?external_id=${encodeURIComponent(externalId)}`,
      },
    });
    if (!invoice.invoiceUrl) throw new Error("Xendit returned no invoiceUrl");

    await ctx.runMutation(internal.payments.recordInvoice, {
      externalId,
      messengerId: args.messengerId,
      plan: args.plan,
      amount,
      currency: "PHP",
      invoiceId: invoice.id,
      invoiceUrl: invoice.invoiceUrl,
    });
    await sendText(args.messengerId, MESSAGES.upgradeStarting(args.plan), accessToken);
    await sendLinkCard(
      args.messengerId,
      {
        title: `Upgrade to ${planLabel} (₱${amount})`,
        subtitle: MESSAGES.paymentLinkSubtitle,
        imageUrl: PAYMENT_CARD_IMAGE_URL,
        url: invoice.invoiceUrl,
        buttonTitle: "Pay Now",
      },
      accessToken,
    );
  } catch (error) {
    console.error(`Checkout failed for ${PLAN_NAMES[args.plan]}`, error);
    await sendText(args.messengerId, MESSAGES.upgradeFailed, accessToken);
  }
}

/**
 * Marks an invoice paid and upgrades the user, in one transaction, so a Xendit retry
 * can never upgrade twice. Returns what the webhook should tell the user.
 */
export const markPaid = internalMutation({
  args: { externalId: v.string(), invoiceId: v.string(), paidAmount: v.optional(v.number()), paidAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
    if (!payment) {
      console.error("Xendit PAID for an unknown external_id");
      return { outcome: "unknown" as const };
    }
    if (payment.status === "PAID") return { outcome: "duplicate" as const };

    if (args.paidAmount !== undefined && args.paidAmount < payment.amount) {
      console.error(`Paid amount ${args.paidAmount} is below the invoice amount ${payment.amount}; not activating`);
      await ctx.db.patch("payments", payment._id, {
        status: "PAID",
        invoiceId: args.invoiceId,
        paidAt: args.paidAt ?? Date.now(),
      });
      return { outcome: "needs_review" as const };
    }

    await ctx.db.patch("payments", payment._id, { status: "PAID", invoiceId: args.invoiceId, paidAt: args.paidAt ?? Date.now() });
    const user = await findUser(ctx, payment.messengerId);
    if (user && user.userType !== "free") {
      // Paid a second invoice while subscribed. Needs a human: refund or extend.
      console.error(`Payment ${payment.externalId} received while the user is already ${user.userType}`);
      return { outcome: "needs_review" as const };
    }
    const activated = await activateSubscription(ctx, payment.messengerId, payment.plan);
    return activated
      ? { outcome: "activated" as const, messengerId: payment.messengerId, plan: payment.plan }
      : { outcome: "needs_review" as const };
  },
});

export const markUnpaid = internalMutation({
  args: { externalId: v.string(), status: v.union(v.literal("EXPIRED"), v.literal("FAILED")) },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
    if (payment && payment.status === "PENDING") await ctx.db.patch("payments", payment._id, { status: args.status });
  },
});
