import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { drawThreeRandomCards } from "./tarot";
import { api } from "./_generated/api";

const http = httpRouter();

// Serve tarot card images
http.route({
  path: "/images/cards/:filename",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const filename = url.pathname.split('/').pop();

    if (!filename) {
      return new Response("Filename required", { status: 400 });
    }

    // Security: only allow .jpg files and basic filename validation
    if (!filename.endsWith('.jpg') || !/^[a-zA-Z0-9]+\.jpg$/.test(filename)) {
      return new Response("Invalid filename", { status: 400 });
    }

    try {
      // In Convex, we need to read from the cards folder
      // The cards folder should be accessible from the convex directory
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, 'cards', filename);

      if (!fs.existsSync(imagePath)) {
        return new Response("Image not found", { status: 404 });
      }

      const imageBuffer = fs.readFileSync(imagePath);

      return new Response(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        },
      });
    } catch (error) {
      console.error("Error serving image:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Facebook webhook verification and message handling
http.route({
  path: "/webhook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification attempt:", { mode, token, challenge });

    // Verify the webhook using an env-configured token
    const verifyToken = process.env.VERIFY_TOKEN || process.env.APP_SECRET;
    if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
      console.log("WEBHOOK_VERIFIED");
      return new Response(challenge, { 
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    } else {
      console.log("Verification failed - incorrect token or mode");
      return new Response("Forbidden", { status: 403 });
    }
  }),
});

http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json() as any;

    // Basic structure per Meta Messenger Webhooks
    if (body.object !== "page" || !Array.isArray(body.entry)) {
      return new Response("Ignored", { status: 200 });
    }

    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN is not set in environment");
      return new Response("Missing ACCESS_TOKEN", { status: 500 });
    }

    for (const entry of body.entry) {
      const messagingEvents = entry.messaging || entry.standby || [];
      for (const event of messagingEvents) {
        const senderId: string | undefined = event.sender?.id;
        const messageText: string | undefined = event.message?.text;
        const isEcho: boolean = Boolean(event.message?.is_echo);

        // Only process actual message events with text, ignore delivery confirmations, etc.
        if (!senderId || isEcho || !event.message || !messageText) continue;

        const trimmedText = messageText.trim();

        // Handle "Start" flow - begin session
        if (trimmedText.toLowerCase().includes("start")) {
          // Check if user can read today
          const canRead = await ctx.runQuery(api.users.canReadToday, { messengerId: senderId });

          if (!canRead) {
            const remainingTime = getRemainingTimeUntilTomorrow();
            await sendTextMessage(senderId, `You've already received your daily reading! ✨\n\nCome back in ${remainingTime} for a new one. 🌟`, accessToken);
          } else {
            // End any existing session first
            await ctx.runMutation(api.users.endSession, { messengerId: senderId });
            // Start new session and prompt for question
            await ctx.runMutation(api.users.startSession, { messengerId: senderId });
            await sendTextMessage(senderId, `🎴 *Welcome to your mystical tarot reading!* ✨

Ask me anything your heart desires, or simply describe your question or situation. You can also choose from the options below:`, accessToken, [
              { title: "💼 Career Path", payload: "What's my career path?" },
              { title: "💝 Love & Relationships", payload: "How can I find true love?" },
              { title: "🧘 Personal Growth", payload: "What should I focus on today?" },
              { title: "🎯 General Guidance", payload: "What guidance do the cards have for me?" }
            ]);
          }
          continue;
        }

        // Check session state for all other messages
        const sessionState = await ctx.runQuery(api.users.getSessionState, { messengerId: senderId });

        if (!sessionState) {
          // Not in session - prompt to start
          await sendTextMessage(senderId, "Ready for your daily tarot reading? 🔮", accessToken, [
            { title: "🎴 Start Reading", payload: "Start" }
          ]);
          continue;
        }

        // User is in session - this should be their question
        if (trimmedText.length > 0) {
          // Double-check they can read today (in case they try to bypass "start")
          const canRead = await ctx.runQuery(api.users.canReadToday, { messengerId: senderId });

          if (!canRead) {
            await ctx.runMutation(api.users.endSession, { messengerId: senderId });
            const remainingTime = getRemainingTimeUntilTomorrow();
            await sendTextMessage(senderId, `You've already received your daily reading! ✨\n\nCome back in ${remainingTime} for a new one. 🌟`, accessToken);
            continue;
          }

          // Acknowledge the question immediately
          await sendTextMessage(senderId, "🔮 *Whispering to the cards...* ✨\n\nI'm connecting with the mystical energies and drawing your three sacred cards. This may take a moment... 🌙", accessToken);

          // Perform the reading
          let cards: any[], interpretation: string;
          try {
            const result = await drawThreeRandomCards(trimmedText);
            cards = result.cards;
            interpretation = result.interpretation;
          } catch (error) {
            // Handle Gemini API errors by asking user to retry
            await sendTextMessage(senderId, `❌ ${error instanceof Error ? error.message : "Something went wrong. Please try your question again."}`, accessToken, [
              { title: "🔄 Try Again", payload: trimmedText }
            ]);
            return new Response("ERROR_HANDLED", { status: 200 });
          }

          // Save reading to database
          const userId = await ctx.runMutation(api.users.createOrUpdateUser, {
            messengerId: senderId,
          });

          await ctx.runMutation(api.readings.createReading, {
            userId,
            messengerId: senderId,
            question: trimmedText,
            cards: cards.map(card => ({
              id: card.id,
              name: card.name,
              meaning: card.meaning,
              position: card.position,
              reversed: card.reversed,
            })),
            interpretation,
            readingType: "daily",
          });

          // Mark reading as done and end session
          await ctx.runMutation(api.users.markReadingDone, { messengerId: senderId });

          // Send all cards as multiple images in one message
          const images = cards.map(card => ({
            filename: card.imageUrl,
            reversed: card.reversed
          }));
          await sendMultipleImageMessage(ctx, senderId, images, accessToken);

          // Send card information as a separate text message
          const cardInfoText = cards.map((card, i) => {
            const positionEmoji = i === 0 ? "⏮️" : i === 1 ? "▶️" : "⏭️";
            const positionName = i === 0 ? "Past" : i === 1 ? "Present" : "Future";
            const status = card.reversed ? " (Reversed)" : "";
            const cardType = card.cardType === "major" ? "Major Arcana" : "Minor Arcana";

            return `${positionEmoji} *${positionName}*: ${card.name}${status}
└─ *${cardType}*
└─ ${card.meaning}`;
          }).join("\n\n");

          await sendTextMessage(senderId, cardInfoText, accessToken);

          // Send a summary message
          const summaryMessage = `🎴 *Your Cards Are Drawn* ✨\n\n*Whispering with the ancient energies to reveal their story...*`;
          await sendTextMessage(senderId, summaryMessage, accessToken);

          // Send interpretation in separate message (limit to 2000 chars for Facebook Messenger)
          const closingText = "\n\n💫 Your daily reading is complete! Come back tomorrow for a new one. 🌟";
          const maxInterpretationLength = 2000 - closingText.length;
          const truncatedInterpretation = interpretation.length > maxInterpretationLength
            ? interpretation.substring(0, maxInterpretationLength - 3) + "..."
            : interpretation;
          const interpretationMessage = `${truncatedInterpretation}${closingText}`;
          await sendTextMessage(senderId, interpretationMessage, accessToken);

          continue;
        }
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  }),
});

export default http;

function getRemainingTimeUntilTomorrow(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diffMs = tomorrow.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
}

async function sendTextMessage(recipientId: string, text: string, accessToken: string, quickReplies?: Array<{title: string, payload: string}>): Promise<void> {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;
  const message: any = { text };
  if (quickReplies && quickReplies.length > 0) {
    message.quick_replies = quickReplies.map(reply => ({
      content_type: "text",
      title: reply.title,
      payload: reply.payload
    }));
  }

  const payload = {
    recipient: { id: recipientId },
    messaging_type: "RESPONSE",
    message,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "<no body>");
    console.error("Failed to send message:", res.status, errorText);
  }
}

async function sendImageMessage(ctx: any, recipientId: string, imageFilename: string, caption: string, accessToken: string): Promise<void> {
  try {
    // First, upload the image to get an attachment_id using the action
    const attachmentId = await ctx.runAction(api.imageActions.uploadImageAttachment, {
      imageFilename,
      accessToken
    });

    // Then send the message using the attachment_id
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;

    const messageData = {
      recipient: {
        id: recipientId  // Page-scoped user ID (PSID)
      },
      messaging_type: "RESPONSE",
      message: {
        attachment: {
          type: "image",
          payload: {
            attachment_id: attachmentId
          }
        }
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "<no body>");
      console.error("Failed to send image:", res.status, errorText);
      // Fallback to sending as text without link if image fails
      await sendTextMessage(recipientId, caption, accessToken);
    } else {
      // Send caption as separate text message
      await sendTextMessage(recipientId, caption, accessToken);
    }
  } catch (error) {
    console.error("Error in sendImageMessage:", error);
    // Fallback to sending as text without link if upload fails
    await sendTextMessage(recipientId, caption, accessToken);
  }
}

async function sendMultipleImageMessage(ctx: any, recipientId: string, images: Array<{filename: string, reversed: boolean}>, accessToken: string): Promise<void> {
  try {
    // Upload all images to get attachment_ids using the new action
    const attachmentIds = await ctx.runAction(api.imageActions.uploadMultipleImageAttachments, {
      images,
      accessToken
    });

    // Send all images as attachments in one message
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;

    const attachments = attachmentIds.map((attachmentId: string) => ({
      type: "image",
      payload: {
        attachment_id: attachmentId
      }
    }));

    const messageData = {
      recipient: {
        id: recipientId
      },
      messaging_type: "RESPONSE",
      message: {
        attachments
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageData),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "<no body>");
      console.error("Failed to send multiple images:", res.status, errorText);
      throw new Error(`Failed to send multiple images: ${res.status} ${errorText}`);
    } else {
      console.log("Successfully sent multiple images");
    }
  } catch (error) {
    console.error("Error in sendMultipleImageMessage:", error);
    // Fallback to sending images individually if batch upload fails
    for (const image of images) {
      await sendImageMessage(ctx, recipientId, image.filename, "", accessToken);
    }
  }
}

