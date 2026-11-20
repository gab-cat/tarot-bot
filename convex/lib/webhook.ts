// Turns raw Messenger webhook events into the shape messenger:handleEvents takes.

import type { InboundEvent } from "../validators";

export interface MessagingEvent {
  sender?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; quick_reply?: { payload?: string } };
  postback?: { mid?: string; payload?: string; title?: string };
}

export interface WebhookBody {
  object?: string;
  entry?: Array<{ messaging?: MessagingEvent[]; standby?: MessagingEvent[] }>;
}

/** Text messages, quick replies and postbacks. Echoes, reads and deliveries are dropped. */
export function normaliseEvent(event: MessagingEvent): InboundEvent | null {
  const senderId = event.sender?.id;
  if (!senderId) return null;
  const timestamp = event.timestamp ?? Date.now();

  if (event.postback?.payload) {
    const payload = event.postback.payload.trim();
    return {
      eventKey: event.postback.mid ?? `postback:${senderId}:${timestamp}:${payload}`,
      senderId,
      timestamp,
      input: payload,
      payload,
    };
  }

  const message = event.message;
  if (!message || message.is_echo || !message.text) return null;
  const payload = message.quick_reply?.payload?.trim();
  return {
    eventKey: message.mid ?? `message:${senderId}:${timestamp}`,
    senderId,
    timestamp,
    input: payload || message.text.trim(),
    payload: payload || undefined,
    messageId: message.mid,
  };
}
