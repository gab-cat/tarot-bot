import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { paymentConfirmationMessage, QUICK_REPLIES } from "./constants";
import { getPageAccessToken, sendText } from "./lib/messenger";
import { timingSafeEqual, verifyMessengerSignature } from "./lib/signature";
import { normaliseEvent, type WebhookBody } from "./lib/webhook";
import type { InboundEvent } from "./validators";

const http = httpRouter();

// Messenger webhook -------------------------------------------------------------

// Subscription check Meta runs when the webhook URL is saved.
http.route({
  path: "/webhook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("hub.verify_token");
    // APP_SECRET was the old fallback name for the verify token; kept so re-verifying still works.
    const verifyToken = process.env.VERIFY_TOKEN || process.env.APP_SECRET;
    if (url.searchParams.get("hub.mode") === "subscribe" && token && verifyToken && timingSafeEqual(token, verifyToken)) {
      return new Response(url.searchParams.get("hub.challenge"), { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    console.warn("Webhook verification failed");
    return new Response("Forbidden", { status: 403 });
  }),
});

// Meta wants a 200 within 5 seconds, retries on timeout and unsubscribes the app after
// an hour of failures. A reading takes 20-60 seconds, so this handler only verifies,
// schedules and acknowledges. messenger:handleEvents does the work.
http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.arrayBuffer();

    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (appSecret) {
      const valid = await verifyMessengerSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret);
      if (!valid) {
        console.warn("Rejected a webhook POST with a bad X-Hub-Signature-256");
        return new Response("Invalid signature", { status: 401 });
      }
    } else {
      console.error("FACEBOOK_APP_SECRET is not set: webhook signatures are NOT being checked");
    }

    let body: WebhookBody;
    try {
      body = JSON.parse(new TextDecoder().decode(rawBody)) as WebhookBody;
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (body.object !== "page" || !Array.isArray(body.entry)) return new Response("Ignored", { status: 200 });

    const bySender = new Map<string, InboundEvent[]>();
    for (const entry of body.entry) {
      for (const raw of [...(entry.messaging ?? []), ...(entry.standby ?? [])]) {
        const event = normaliseEvent(raw);
        if (!event) continue;
        bySender.set(event.senderId, [...(bySender.get(event.senderId) ?? []), event]);
      }
    }
    for (const events of bySender.values()) {
      events.sort((a, b) => a.timestamp - b.timestamp);
      await ctx.scheduler.runAfter(0, internal.messenger.handleEvents, { events });
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  }),
});

// Xendit invoice callback ---------------------------------------------------------

interface XenditInvoiceEvent {
  id?: string;
  external_id?: string;
  status?: string;
  paid_amount?: number;
  paid_at?: string;
}

http.route({
  path: "/xendit/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = process.env.XENDIT_CALLBACK_TOKEN;
    const received = request.headers.get("x-callback-token");
    if (!expected || !received || !timingSafeEqual(received, expected)) {
      console.warn("Rejected a Xendit callback with a bad token");
      return new Response("Unauthorized", { status: 401 });
    }

    let event: XenditInvoiceEvent;
    try {
      event = (await request.json()) as XenditInvoiceEvent;
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const status = event.status?.toUpperCase();
    const externalId = event.external_id;
    if (!externalId || !status) return new Response("Ignored", { status: 200 });
    console.log("Xendit callback", { invoiceId: event.id, status });

    if (status === "PAID" || status === "SETTLED") {
      const result = await ctx.runMutation(internal.payments.markPaid, {
        externalId,
        invoiceId: event.id ?? externalId,
        paidAmount: event.paid_amount,
        paidAt: event.paid_at ? new Date(event.paid_at).getTime() : undefined,
      });
      const accessToken = getPageAccessToken();
      if (result.outcome === "activated" && accessToken) {
        await sendText(result.messengerId, paymentConfirmationMessage(result.plan), accessToken, [
          QUICK_REPLIES.startReading,
          QUICK_REPLIES.aboutMe,
        ]);
      }
    } else if (status === "EXPIRED" || status === "FAILED") {
      await ctx.runMutation(internal.payments.markUnpaid, { externalId, status });
    }
    return new Response("OK", { status: 200 });
  }),
});

export default http;
