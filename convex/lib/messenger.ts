// Graph API client for the Messenger Send API. Plain functions, safe in both the
// Convex and Node runtimes. The page token travels as a query parameter, so never
// log a request URL.

import { MESSENGER_MAX_CHARS, splitMessageIntoChunks, truncate } from "./text";

// v23.0 is supported until 2027-10-08. v26.0 has no Messenger endpoint changes.
// Check https://developers.facebook.com/docs/graph-api/changelog before bumping.
export const GRAPH_API_VERSION = "v26.0";

/** Messenger cuts quick reply titles longer than this. */
export const QUICK_REPLY_TITLE_MAX = 20;
/** Messenger rejects quick reply payloads longer than this. */
export const QUICK_REPLY_PAYLOAD_MAX = 1000;

export type QuickReply = { title: string; payload: string };

/** RESPONSE answers a message; UPDATE is a proactive send inside the 24-hour window. */
export type MessagingType = "RESPONSE" | "UPDATE";

type OutgoingMessage = {
  text?: string;
  quick_replies?: Array<{ content_type: "text"; title: string; payload: string }>;
  attachment?: unknown;
  attachments?: unknown[];
};

export interface FacebookUserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}

export function graphUrl(path: string, accessToken: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}${separator}access_token=${encodeURIComponent(accessToken)}`;
}

export function getPageAccessToken(): string | null {
  return process.env.ACCESS_TOKEN || null;
}

function toQuickReplies(replies: QuickReply[] | undefined): OutgoingMessage["quick_replies"] {
  if (!replies || replies.length === 0) return undefined;
  return replies.slice(0, 13).map((reply) => ({
    content_type: "text",
    title: truncate(reply.title, QUICK_REPLY_TITLE_MAX),
    payload: truncate(reply.payload, QUICK_REPLY_PAYLOAD_MAX),
  }));
}

async function postMessage(
  recipientId: string,
  message: OutgoingMessage,
  accessToken: string,
  messagingType: MessagingType,
): Promise<Response> {
  return await fetch(graphUrl("me/messages", accessToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, messaging_type: messagingType, message }),
  });
}

/**
 * Sends one message. If another app holds the thread (error 10 / 2018300), takes
 * thread control and retries once. Returns false on failure; never throws.
 */
export async function sendMessage(
  recipientId: string,
  message: OutgoingMessage,
  accessToken: string,
  messagingType: MessagingType = "RESPONSE",
): Promise<boolean> {
  try {
    const res = await postMessage(recipientId, message, accessToken, messagingType);
    if (res.ok) return true;

    const errorText = await res.text().catch(() => "");
    let error: { code?: number; error_subcode?: number } | undefined;
    try {
      error = (JSON.parse(errorText) as { error?: { code?: number; error_subcode?: number } }).error;
    } catch {
      error = undefined;
    }

    if (error?.code === 10 && error.error_subcode === 2018300) {
      const control = await fetch(graphUrl("me/take_thread_control", accessToken), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId } }),
      });
      if (control.ok) {
        const retry = await postMessage(recipientId, message, accessToken, messagingType);
        if (retry.ok) return true;
        console.error("Send failed after taking thread control", retry.status, await retry.text().catch(() => ""));
        return false;
      }
      console.error("Could not take thread control", control.status, await control.text().catch(() => ""));
      return false;
    }

    console.error("Messenger send failed", res.status, errorText);
    return false;
  } catch (error) {
    console.error("Messenger send threw", error);
    return false;
  }
}

/**
 * Sends text, split into several messages when it is over 2000 characters.
 * Quick replies go on the last message only. Stops at the first failed chunk.
 */
export async function sendText(
  recipientId: string,
  text: string,
  accessToken: string,
  quickReplies?: QuickReply[],
  messagingType: MessagingType = "RESPONSE",
): Promise<boolean> {
  const chunks = splitMessageIntoChunks(text, MESSENGER_MAX_CHARS);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const sent = await sendMessage(
      recipientId,
      { text: chunks[i], quick_replies: isLast ? toQuickReplies(quickReplies) : undefined },
      accessToken,
      messagingType,
    );
    if (!sent) return false;
  }
  return true;
}

/** Sends several already-uploaded images in one message. */
export async function sendImages(recipientId: string, attachmentIds: string[], accessToken: string): Promise<boolean> {
  return await sendMessage(
    recipientId,
    {
      attachments: attachmentIds.map((attachmentId) => ({
        type: "image",
        payload: { attachment_id: attachmentId },
      })),
    },
    accessToken,
  );
}

/** A card with a title, subtitle, image and one link button. Falls back to plain text. */
export async function sendLinkCard(
  recipientId: string,
  card: { title: string; subtitle: string; imageUrl?: string; url: string; buttonTitle: string },
  accessToken: string,
): Promise<boolean> {
  const sent = await sendMessage(
    recipientId,
    {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: card.title,
              subtitle: card.subtitle,
              image_url: card.imageUrl,
              default_action: { type: "web_url", url: card.url, webview_height_ratio: "compact" },
              buttons: [{ type: "web_url", url: card.url, title: card.buttonTitle }],
            },
          ],
        },
      },
    },
    accessToken,
  );
  if (sent) return true;
  return await sendText(recipientId, `${card.title}\n\n${card.subtitle}\n\n${card.url}`, accessToken);
}

/**
 * Profile by PSID. Fails with error 100/33 for people who signed up to Facebook
 * with a phone number; see docs/FACEBOOK_API_PERMISSIONS.md. Returns null on failure.
 */
export async function fetchUserProfile(psid: string, accessToken: string): Promise<FacebookUserProfile | null> {
  try {
    const res = await fetch(graphUrl(`${encodeURIComponent(psid)}?fields=id,first_name,last_name,name`, accessToken));
    if (res.ok) return (await res.json()) as FacebookUserProfile;
    const body = await res.text().catch(() => "");
    const isPhoneOnlyAccount = body.includes('"code":100') && body.includes('"error_subcode":33');
    if (!isPhoneOnlyAccount) console.warn("Profile lookup failed", res.status, body);
    return null;
  } catch (error) {
    console.warn("Profile lookup threw", error);
    return null;
  }
}

/** Fallback for phone-only accounts: read the sender off the message itself. */
export async function fetchSenderViaMessage(messageId: string, accessToken: string): Promise<FacebookUserProfile | null> {
  try {
    const res = await fetch(graphUrl(`${encodeURIComponent(messageId)}?fields=from`, accessToken));
    if (!res.ok) return null;
    const data = (await res.json()) as { from?: { id: string; name?: string; first_name?: string; last_name?: string } };
    if (!data.from) return null;
    return {
      id: data.from.id,
      name: data.from.name,
      first_name: data.from.first_name ?? data.from.name?.split(" ")[0],
      last_name: data.from.last_name,
    };
  } catch {
    return null;
  }
}
