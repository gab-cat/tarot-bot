import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { drawThreeRandomCards, type DrawnCard } from "./tarot";
import { api, internal } from "./_generated/api";
import { type Doc } from "./_generated/dataModel";


// Facebook webhook types
interface FacebookWebhookMessage {
  mid: string;
  text?: string;
  quick_reply?: {
    payload: string;
  };
  attachments?: Array<{
    type: string;
    payload: { url: string };
  }>;
  is_echo?: boolean;
}

interface FacebookWebhookMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: FacebookWebhookMessage;
  postback?: {
    payload: string;
  };
}

interface FacebookWebhookEntry {
  id: string;
  messaging?: FacebookWebhookMessaging[];
  standby?: FacebookWebhookMessaging[];
}

interface FacebookWebhookBody {
  object: string;
  entry: FacebookWebhookEntry[];
}

interface FacebookMessageData {
  recipient: { id: string };
  message: {
    text?: string;
    attachment?: {
      type: string;
      payload: { url: string };
    };
    quick_replies?: Array<{
      content_type: "text";
      title: string;
      payload: string;
    }>;
  };
}
import {
  MESSAGES,
  QUICK_REPLIES,
  ERRORS,
  HTTP_RESPONSES,
  GEMINI_ERROR_MESSAGE,
  getDailyLimitMessage,
  formatCardSummary
} from "./constants";
import { validateBirthdate } from "./users";

interface XenditInvoiceEvent {
  id: string;
  external_id: string;
  status: 'PAID' | 'EXPIRED' | 'FAILED' | 'PENDING' | string; // Allow other statuses
  amount?: number;
  paid_amount?: number;
  paid_at?: string;
  payer_email?: string;
  description?: string;
  currency?: string;
  user_id?: string;
  payment_method?: string;
  bank_code?: string;
  [key: string]: unknown; // For additional fields
}

const http = httpRouter();

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
      return new Response(HTTP_RESPONSES.forbidden, { status: 403 });
    }
  }),
});

http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json() as FacebookWebhookBody;

    // Basic structure per Meta Messenger Webhooks
    if (body.object !== "page" || !Array.isArray(body.entry)) {
      return new Response(ERRORS.webhookIgnored, { status: 200 });
    }

    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      console.error("ACCESS_TOKEN is not set in environment");
      return new Response(ERRORS.accessTokenMissing, { status: 500 });
    }

    for (const entry of body.entry) {
      const messagingEvents = entry.messaging || entry.standby || [];
      for (const event of messagingEvents) {
        const senderId: string | undefined = event.sender?.id;
        const messageText: string | undefined = event.message?.text;
        const isEcho: boolean = Boolean(event.message?.is_echo);

        // Only process actual message events with text or postback events, ignore delivery confirmations, etc.
        const hasValidContent = event.message && !isEcho && messageText || event.postback;
        if (!senderId || !hasValidContent) continue;

        const trimmedText = messageText ? messageText.trim() : "";

        // Handle upgrade postbacks and quick replies
        const postbackPayload = event.postback?.payload;
        const quickReplyPayload = event.message?.quick_reply?.payload;
        const upgradePayload = postbackPayload || quickReplyPayload;

        if (upgradePayload?.startsWith("UPGRADE_")) {
          const plan = upgradePayload === "UPGRADE_MYSTIC" ? "mystic" : "oracle";
          const baseUrl = process.env.APP_BASE_URL || "https://your-project.convex.cloud";
          const checkoutResponse = await fetch(`${baseUrl}/xendit/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messengerId: senderId, plan }),
          });

          if (checkoutResponse.ok) {
            console.log(`Upgrade checkout initiated for ${plan}`);
            await sendTextMessage(senderId, `🔮 Initiating ${plan} upgrade... Check your payment link!`, accessToken);
          } else {
            const errorText = await checkoutResponse.text();
            console.error("Checkout initiation failed:", errorText);
            await sendTextMessage(senderId, "❌ Upgrade initiation failed. Please try again or contact support.", accessToken);
          }
          continue;
        }

        // Handle upgrade text intent
        const sessionState = await ctx.runQuery(api.users.getSessionState, { messengerId: senderId });
        const activeSessionStates = ["followup_available", "followup_in_progress", "waiting_question", "reading_in_progress"];
        const isInActiveSession = sessionState && activeSessionStates.includes(sessionState);

        if (trimmedText.toLowerCase().includes("upgrade") && !isInActiveSession) {
          await sendTextMessage(senderId, "⭐ *Ready to unlock premium features?* ✨\n\nChoose your upgrade path:", accessToken, [
            { title: "Mystic Guide (₱49) - 5 daily readings", payload: "UPGRADE_MYSTIC" },
            { title: "Oracle Master (₱99) - Unlimited access", payload: "UPGRADE_ORACLE" },
          ]);
          continue;
        }

        // Handle Get Started postback
        if (event.postback?.payload === "GET_STARTED") {
          await handleGetStartedPostback(ctx, senderId, accessToken);
          console.log("Get Started postback handled");
          continue;
        }

        // Handle follow-up session states
        if (sessionState === "followup_available" || sessionState === "followup_in_progress") {
          await handleFollowupMessage(ctx, senderId, trimmedText, accessToken, event);
          continue;
        }

        // Handle cancel command - allow users to terminate sessions
        if (trimmedText.toLowerCase() === "cancel" && sessionState && sessionState !== "reading_complete") {
          await ctx.runMutation(internal.users.endSession, { messengerId: senderId });
          await sendTextMessage(senderId, "✋ *Session cancelled* ✨\n\nYour reading session has been ended. Feel free to start a new one whenever you're ready! 🔮", accessToken, [
            QUICK_REPLIES.start,
            QUICK_REPLIES.aboutMe
          ]);
          continue;
        }

        if (sessionState === "reading_complete") {
          // Reading was recently completed - ask user to wait
          await sendTextMessage(senderId, MESSAGES.readingTooFresh, accessToken);
          continue;
        }

        if (sessionState === "reading_in_progress") {
          // Reading is already in progress - ignore this message to prevent duplicate processing
          continue;
        }

        // Handle birthdate collection state
        if (sessionState === "waiting_birthdate") {
          // Validate the birthdate format
          if (validateBirthdate(trimmedText)) {
            // Save the birthdate and move to question asking
            await ctx.runMutation(api.users.updateUserBirthdate, {
              messengerId: senderId,
              birthdate: trimmedText.trim()
            });

            // Start the reading session
            await ctx.runMutation(api.users.startSession, { messengerId: senderId });

            // Get user name for personalized greeting
            const existingUser = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });
            const userName = existingUser && (existingUser.firstName || existingUser.lastName)
              ? [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ")
              : null;

            const personalizedWelcome = userName
              ? `🎴 *Perfect, ${userName}!* ✨\n\nWhat question would you like to ask the cards today? 🔮\n\n*You can ask about anything:* love, career, personal growth, or whatever is on your heart. 🌙 \nOr, you can simply describe your question or situation.`
              : `🎴 *Perfect!* ✨\n\nWhat question would you like to ask the cards today? 🔮\n\n*You can ask about anything:* love, career, personal growth, or whatever is on your heart. 🌙 \nOr, you can simply describe your question or situation.`;

            await sendTextMessage(senderId, MESSAGES.birthdateSaved + "\n\n" + personalizedWelcome, accessToken, [
              QUICK_REPLIES.career,
              QUICK_REPLIES.love,
              QUICK_REPLIES.growth,
              QUICK_REPLIES.guidance
            ]);
          } else {
            // Invalid format, ask again
            await sendTextMessage(senderId, MESSAGES.invalidBirthdate, accessToken);
          }
          continue;
        }

        // Handle greetings - send personalized welcome with buttons (only when not in session)
        if (isGreeting(trimmedText) && !isInActiveSession) {
          const existingUser = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });
          const userName = existingUser && (existingUser.firstName || existingUser.lastName)
            ? [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ")
            : null;

          const personalizedWelcome = userName
            ? `🎴 *Welcome back, ${userName}!* ✨\n\nReady for your daily tarot reading? 🔮`
            : MESSAGES.readyForReading;

          await sendTextMessage(senderId, personalizedWelcome, accessToken, [
            QUICK_REPLIES.start,
            QUICK_REPLIES.aboutMe
          ]);
          return new Response(ERRORS.eventReceived, { status: 200 });
        }

        // Handle "About Me" request (only when not in session)
        if ((trimmedText.toLowerCase().includes("about me") || trimmedText === "About Me") && !isInActiveSession) {
          const profileMessage = await ctx.runAction(api.users.generateUserProfileMessage, {
            messengerId: senderId,
          });
          const user = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });
          const upgradeReplies = user?.userType === "free" ? [
            { title: "Upgrade Mystic (₱49)", payload: "UPGRADE_MYSTIC" },
            { title: "Upgrade Oracle (₱99)", payload: "UPGRADE_ORACLE" },
            QUICK_REPLIES.start
          ] : [QUICK_REPLIES.start];
          await sendTextMessage(senderId, profileMessage, accessToken, upgradeReplies);
          continue;
        }

        // Handle "Quick Question" - provide quick guidance
        if (trimmedText.toLowerCase().includes("quick question") && !isInActiveSession) {
          await sendTextMessage(senderId, "❓ *Quick mystical guidance awaits...* ✨\n\nShare your brief question or situation, and I'll draw a single card to illuminate your path. 🌙", accessToken, [
            QUICK_REPLIES.start,
            QUICK_REPLIES.aboutMe
          ]);
          continue;
        }

        // Handle "Daily Insight" - provide general daily guidance
        if (trimmedText.toLowerCase().includes("daily insight") && !isInActiveSession) {
          await sendTextMessage(senderId, "✨ *Daily cosmic wisdom...* 🔮\n\nThe cards have a special message for you today. Ready to receive their guidance?", accessToken, [
            QUICK_REPLIES.start,
            QUICK_REPLIES.guidance,
            QUICK_REPLIES.aboutMe
          ]);
          continue;
        }

        // Handle "Start" flow - begin session (only when not in session)
        if (trimmedText.toLowerCase().includes("start") && !isInActiveSession) {
          // Check if user can read today
          const canRead = await ctx.runQuery(api.users.canReadToday, { messengerId: senderId });

          if (!canRead) {
            const remainingTime = getRemainingTimeUntilTomorrow();
            // Get user info for upgrade prompts
            const existingUser = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });
            const userType = existingUser?.userType || "free";
            const upgradeReplies = userType === "free" ? [
              { title: "Upgrade Mystic (₱49)", payload: "UPGRADE_MYSTIC" },
              { title: "Upgrade Oracle (₱99)", payload: "UPGRADE_ORACLE" }
            ] : [];
            await sendTextMessage(senderId, getDailyLimitMessage(remainingTime, userType), accessToken, upgradeReplies);
          } else {
            // Get existing user to check birthdate
            const existingUser = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });

            // Check if user has birthdate
            if (!existingUser?.birthdate) {
              // No birthdate - prompt for it first
              await ctx.runMutation(api.users.setWaitingBirthdate, { messengerId: senderId });
              await sendTextMessage(senderId, MESSAGES.promptBirthdate, accessToken);
            } else {
              // Has birthdate - proceed with reading
              // End any existing session first
              await ctx.runMutation(internal.users.endSession, { messengerId: senderId });

              // Get user name for personalized greeting
              const userName = existingUser && (existingUser.firstName || existingUser.lastName)
                ? [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ")
                : null;

              // Start new session and prompt for question
              await ctx.runMutation(api.users.startSession, { messengerId: senderId });

              const personalizedWelcome = userName
                ? `🎴 *What question would you like to ask the cards today? 🔮\n\n*You can ask about anything:* love, career, personal growth, or whatever is on your heart. 🌙 \nOr, you can simply describe your question or situation.`
                : `🎴 *Welcome!* ✨\n\nWhat question would you like to ask the cards today? 🔮\n\n*You can ask about anything:* love, career, personal growth, or whatever is on your heart. 🌙 \nOr, you can simply describe your question or situation.`;

              await sendTextMessage(senderId, personalizedWelcome, accessToken, [
                QUICK_REPLIES.career,
                QUICK_REPLIES.love,
                QUICK_REPLIES.growth,
                QUICK_REPLIES.guidance
              ]);
            }
          }
          continue;
        }

        // Handle case when user is not in session
        if (!isInActiveSession && !sessionState) {
          // Not in session - prompt to start
          await sendTextMessage(senderId, MESSAGES.readyForReading, accessToken, [
            QUICK_REPLIES.start
          ]);
          continue;
        }

        // User is in waiting_question state - treat their message as a question
        if (trimmedText.length > 0) {
          // Double-check they can read today (in case they try to bypass "start")
          const canRead = await ctx.runQuery(api.users.canReadToday, { messengerId: senderId });

          if (!canRead) {
            await ctx.runMutation(internal.users.endSession, { messengerId: senderId });
            const remainingTime = getRemainingTimeUntilTomorrow();
            // Get user info for upgrade prompts
            const existingUser = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });
            // const userType = existingUser?.userType || "free";
            const upgradeReplies = existingUser?.userType === "free" ? [
              { title: "Upgrade Mystic (₱49)", payload: "UPGRADE_MYSTIC" },
              { title: "Upgrade Oracle (₱99)", payload: "UPGRADE_ORACLE" }
            ] : [];
            await sendTextMessage(senderId, getDailyLimitMessage(remainingTime, existingUser?.userType), accessToken, upgradeReplies);
            continue;
          }

          // Set session to reading in progress to prevent duplicate processing
          await ctx.runMutation(api.users.setReadingInProgress, { messengerId: senderId });

          // Acknowledge the question immediately
          await sendTextMessage(senderId, MESSAGES.readingInProgress, accessToken);

          // Get user name and birthdate for personalized reading
          const existingUser = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });

          const existingUserName = existingUser && (existingUser.firstName || existingUser.lastName)
            ? [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ")
            : undefined;

          // Perform the reading
          let cards: DrawnCard[], interpretation: string;
          try {
            const result = await drawThreeRandomCards(trimmedText, existingUserName, existingUser?.birthdate);
            cards = result.cards;
            interpretation = result.interpretation;
          } catch {
            // Reset session state on error
            await ctx.runMutation(internal.users.endSession, { messengerId: senderId });
            // Handle Gemini API errors by asking user to retry
            await sendTextMessage(senderId, `❌ ${GEMINI_ERROR_MESSAGE}`, accessToken, [
              { title: "🔄 Try Again", payload: trimmedText }
            ]);
            return new Response(ERRORS.errorHandled, { status: 200 });
          }

          // Get or create user with profile information from Facebook
          let userProfile = null;
          try {
            userProfile = await ctx.runAction(api.facebookApi.getUserProfile, {
              userId: senderId,
              accessToken,
            });
          } catch (error) {
            console.warn("Failed to fetch user profile from Facebook:", error);
          }

          // Save reading to database
          const userId = await ctx.runMutation(api.users.createOrUpdateUser, {
            messengerId: senderId,
            firstName: userProfile?.first_name,
            lastName: userProfile?.last_name,
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
              description: card.description,
              cardType: card.cardType,
            })),
            interpretation,
            readingType: "daily",
          });

          // Get the updated user info to include name in future readings
          await ctx.runQuery(api.users.getUserById, { userId });

          // Mark reading as done and end session
          await ctx.runMutation(api.users.markReadingDone, { messengerId: senderId });

          // Send all cards as multiple images in one message
          const images = cards.map(card => ({
            filename: card.imageUrl,
            reversed: card.reversed
          }));
          await sendMultipleImageMessage(ctx, senderId, images, accessToken);

          // Send card information as a separate text message
          const cardInfoText = cards.map((card) => formatCardSummary(card)).join("\n\n");
          await sendTextMessage(senderId, cardInfoText, accessToken);

          // Send a summary message
          await sendTextMessage(senderId, MESSAGES.cardsDrawn, accessToken);

          // Send interpretation in separate message (limit to 2000 chars for Facebook Messenger)
          const maxInterpretationLength = 2000 - MESSAGES.readingComplete.length;
          const truncatedInterpretation = interpretation.length > maxInterpretationLength
            ? interpretation.substring(0, maxInterpretationLength - 3) + "..."
            : interpretation;
          const interpretationMessage = `${truncatedInterpretation}${MESSAGES.readingComplete}`;
          await sendTextMessage(senderId, interpretationMessage, accessToken);

          // Start followup session after reading is completed
          try {
            const user = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: senderId });
            if (user) {
              const lastReadings = await ctx.runQuery(api.users.getLastReadings, {
                userId: user._id,
                limit: 1
              });
              if (lastReadings.length > 0) {
                const latestReading = lastReadings[0];

                // First, mark the reading as completed
                await ctx.runMutation(internal.readings.updateSessionState, {
                  readingId: latestReading._id,
                  sessionState: "completed"
                });

                // Then start the followup session
                await ctx.runAction(api.followups.startFollowupSession, {
                  readingId: latestReading._id,
                  messengerId: senderId
                });

                // Send followup prompt
                const success = await ctx.runAction(api.facebookApi.sendFollowupPrompt, { messengerId: senderId });
                if (!success) {
                  console.warn("Failed to send followup prompt after reading completion");
                }

                // Schedule automatic session cleanup after 10 minutes
                await ctx.scheduler.runAfter(10 * 60 * 1000, api.followups.autoEndFollowupSession, {
                  readingId: latestReading._id,
                  messengerId: senderId
                });
              }
            }
          } catch (error) {
            console.error("Error starting followup session after reading:", error);
          }

          continue;
        }
      }
    }

    return new Response(ERRORS.eventReceived, { status: 200 });
  }),
});

// Handle Get Started postback
async function handleGetStartedPostback(ctx: ActionCtx, messengerId: string, accessToken: string): Promise<void> {
  try {
    // Get user profile information
    let userProfile = null;
    try {
      userProfile = await ctx.runAction(api.facebookApi.getUserProfile, {
        userId: messengerId,
        accessToken,
      });
    } catch (error) {
      console.warn("Failed to fetch user profile for Get Started:", error);
    }

    // Create personalized welcome message
    const userName = userProfile?.first_name || userProfile?.name?.split(' ')[0];
    const welcomeMessage = userName
      ? `🎴 *Welcome, ${userName}!* ✨\n\nThe ancient cards are whispering your name... I'm your mystical tarot guide, here to illuminate your path with cosmic wisdom. 🔮\n\nWhat question calls to your soul today?`
      : MESSAGES.getStartedWelcome;

    await sendTextMessage(messengerId, welcomeMessage, accessToken, [
      QUICK_REPLIES.start,
      QUICK_REPLIES.quickQuestion,
      QUICK_REPLIES.aboutMe
    ]);

  } catch (error) {
    console.error("Error handling Get Started postback:", error);
    await sendTextMessage(messengerId, MESSAGES.welcome, accessToken, [
      QUICK_REPLIES.start,
      QUICK_REPLIES.aboutMe
    ]);
  }
}

// Handle follow-up messages during active follow-up sessions
async function handleFollowupMessage(ctx: ActionCtx, messengerId: string, messageText: string, accessToken: string, event: FacebookWebhookMessaging): Promise<void> {
  try {
    // Get user's active reading session
    const user = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId });
    if (!user) {
      await sendTextMessage(messengerId, "❌ Session error. Please start a new reading.", accessToken);
      return;
    }

    // Find the most recent completed reading that can have follow-ups
    const recentReadings = await ctx.runQuery(api.users.getLastReadings, {
      userId: user._id,
      limit: 5
    });

    const activeReading = recentReadings.find((reading: Doc<"readings">) =>
      reading.sessionState === "followup_available" ||
      reading.sessionState === "followup_in_progress"
    );

    if (!activeReading) {
      await sendTextMessage(messengerId, "❌ No active follow-up session found. Please complete a reading first.", accessToken);
      return;
    }

    // Check if this is a quick reply payload
    const quickReplyPayload = event?.message?.quick_reply?.payload;
    if (quickReplyPayload) {
      await handleFollowupQuickReply(ctx, messengerId, quickReplyPayload, activeReading, accessToken);
      return;
    }

    // Check if this is a postback
    const postbackPayload = event?.postback?.payload;
    if (postbackPayload) {
      await handleFollowupPostback(ctx, messengerId, postbackPayload, activeReading, accessToken);
      return;
    }

    // Handle text message as follow-up question
    if (messageText && messageText.length > 0) {
      await processFollowupQuestion(ctx, messengerId, messageText, activeReading, accessToken);
    }

  } catch (error) {
    console.error("Error handling follow-up message:", error);
    await sendTextMessage(messengerId, "❌ An error occurred. Please try again.", accessToken);
  }
}

async function handleFollowupQuickReply(ctx: ActionCtx, messengerId: string, payload: string, reading: Doc<"readings">, accessToken: string): Promise<void> {
  switch (payload) {
    case "FOLLOWUP_QUESTION": {
      // Send prompt for follow-up question
      const success = await ctx.runAction(api.facebookApi.sendFollowupPrompt, { messengerId });
      if (!success) {
        await sendTextMessage(messengerId, "❌ Failed to send follow-up prompt. Please try again.", accessToken);
      }
      break;
    }

    case "END_READING_SESSION": {
      // End the follow-up session
      const result = await ctx.runAction(api.followups.endFollowupSession, {
        readingId: reading._id,
        messengerId
      });
      // Send goodbye message with option to start new reading
      await sendTextMessage(messengerId, result.message, accessToken, [
        { title: "🎴 Start Reading", payload: "Start" }
      ]);
      break;
    }

    case "UPGRADE_PROMPT": {
      // Show upgrade prompt (simplified for now)
      await sendTextMessage(messengerId, "⭐ *Ready to unlock more mystical insights?*\n\nUpgrade to access unlimited follow-up questions and deeper guidance! 🔮", accessToken);
      break;
    }

    default:
      console.warn(`Unknown follow-up quick reply payload: ${payload}`);
  }
}

async function handleFollowupPostback(ctx: ActionCtx, messengerId: string, payload: string, reading: Doc<"readings">, accessToken: string): Promise<void> {
  switch (payload) {
    case "END_READING_SESSION": {
      // End the follow-up session
      const result = await ctx.runAction(api.followups.endFollowupSession, {
        readingId: reading._id,
        messengerId
      });
      // Send goodbye message with option to start new reading
      await sendTextMessage(messengerId, result.message, accessToken, [
        { title: "🎴 Start Reading", payload: "Start" }
      ]);
      break;
    }

    default:
      console.warn(`Unknown follow-up postback payload: ${payload}`);
  }
}

async function processFollowupQuestion(ctx: ActionCtx, messengerId: string, question: string, reading: Doc<"readings">, accessToken: string): Promise<void> {
  try {
    // Process the follow-up question
    const result = await ctx.runAction(api.followups.askFollowupQuestion, {
      readingId: reading._id,
      messengerId,
      question
    });

    if (result.response) {
      // Send the AI response with appropriate quick replies
      const success = await ctx.runAction(api.facebookApi.sendFollowupResponse, {
        messengerId,
        response: result.response,
        remainingQuestions: result.remainingQuestions,
        questionLimit: reading.maxFollowups
      });

      if (!success) {
        await sendTextMessage(messengerId, "❌ Failed to send response. Please try again.", accessToken);
      }
    } else {
      await sendTextMessage(messengerId, "❌ Failed to process your question. Please try again.", accessToken);
    }

  } catch (error) {
    console.error("Error processing follow-up question:", error);

    // Handle specific error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Follow-up question limit exceeded")) {
      const upgradeReplies = [
        { title: "Upgrade Mystic (₱49)", payload: "UPGRADE_MYSTIC" },
        { title: "Upgrade Oracle (₱99)", payload: "UPGRADE_ORACLE" }
      ];
      await sendTextMessage(messengerId, "🌟 *You've reached your follow-up limit for this reading* ✨\n\nReady to explore more mystical wisdom? Upgrade your experience!", accessToken, upgradeReplies);
    } else if (errorMessage.includes("Question appears unrelated")) {
      await sendTextMessage(messengerId, "❌ *I couldn't fully connect that question to your reading* ✨\n\nTry rephrasing or asking about specific cards from your spread.", accessToken);
    } else {
      await sendTextMessage(messengerId, "❌ An error occurred while processing your question. Please try again.", accessToken);
    }
  }
}

const phpToCentavos = (pesos: number): number => Math.round(pesos * 100);

async function sendUpgradeLink(recipientId: string, title: string, url: string, accessToken: string): Promise<void> {
  const messageUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;
  const messageData = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: title,
            subtitle: "This payment is securely processed by Xendit. We accept major credit cards and popular e-wallets.",
            image_url: "https://dependable-gopher-336.convex.cloud/api/storage/c3c82463-85ae-45b6-b864-05e30d70a4e2", // Optional, can omit or use a tarot image
            default_action: {
              type: "web_url",
              url: url,
              webview_height_ratio: "compact" as const,
            },
            buttons: [{
              type: "web_url",
              url: url,
              title: "Pay Now",
            }],
          }],
        },
      },
    },
  };

  const res = await fetch(messageUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messageData),
  });

  if (!res.ok) {
    console.error("Failed to send upgrade link:", res.status, await res.text());
    // Fallback to text message
    await sendTextMessage(recipientId, `${title}\n\nThis payment is securely processed by Xendit. We accept major credit cards and popular e-wallets.\n\n${url}`, accessToken);
  }
}

// POST /xendit/checkout
http.route({
  path: "/xendit/checkout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json() as { messengerId: string; plan: "mystic" | "oracle" };
      const { messengerId, plan } = body;

      if (!messengerId || !plan) {
        return new Response("Missing messengerId or plan", { status: 400 });
      }

      // Get or create user
      let user = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId });
      if (!user) {
        const userId = await ctx.runMutation(api.users.createOrUpdateUser, {
          messengerId,
          firstName: undefined,
          lastName: undefined,
        });
        user = await ctx.runQuery(api.users.getUserById, { userId });
      }

      const now = Date.now();
      const externalId = `tb-${plan}-${messengerId}-${now}`;
      const amount = plan === "mystic" ? 49 : 99;
      const currency = "PHP";
      const description = `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
      const redirectUrl = process.env.REDIRECT_URL || "https://your-project.convex.cloud";
      const successRedirect = `${redirectUrl}/xendit/success?external_id=${externalId}`;
      const failureRedirect = `${redirectUrl}/xendit/failure?external_id=${externalId}`;

      const secretKey = process.env.XENDIT_SECRET_KEY;
      if (!secretKey) {
        console.error("XENDIT_SECRET_KEY not set");
        return new Response("Server configuration error", { status: 500 });
      }

      const authHeader = `Basic ${btoa(`${secretKey}:`)}`;

      const invoiceResponse = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          external_id: externalId,
          amount: phpToCentavos(amount),
          description,
          currency,
          success_redirect_url: successRedirect,
          failure_redirect_url: failureRedirect,
        }),
      });

      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        console.error("Xendit invoice creation failed:", invoiceResponse.status, errorText);
        return new Response("Payment creation failed", { status: 500 });
      }

      const invoiceData = await invoiceResponse.json();
      const invoiceUrl = invoiceData.invoice_url;

      if (!invoiceUrl) {
        console.error("No invoice_url in Xendit response");
        return new Response("Payment creation failed", { status: 500 });
      }

      // Persist payment
      await ctx.runMutation(api.payments.createPayment, {
        messengerId,
        plan,
        externalId,
        amount,
        currency,
        invoiceUrl,
      });

      const accessToken = process.env.ACCESS_TOKEN;
      if (accessToken) {
        await sendUpgradeLink(messengerId, `Upgrade to ${plan} (₱${amount})`, invoiceUrl, accessToken);
      }

      return new Response(JSON.stringify({ success: true, invoiceUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Checkout error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// POST /xendit/webhook
http.route({
  path: "/xendit/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const callbackToken = request.headers.get("x-callback-token");
      const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;

      if (callbackToken !== expectedToken) {
        console.warn("Invalid callback token");
        return new Response("Unauthorized", { status: 401 });
      }

      const event = await request.json() as XenditInvoiceEvent;

      console.log("Xendit webhook received:", event);

      if (event.status.toUpperCase() === 'PAID') {
        const externalId = event.external_id;
        const payment = await ctx.runQuery(api.payments.getPaymentByExternalId, { externalId });

        if (payment && payment.status === "PENDING") {
          // Update payment
          await ctx.runMutation(internal.payments.updatePaymentStatus, {
            externalId,
            status: "PAID",
            invoiceId: event.id,
            paidAt: event.paid_at ? new Date(event.paid_at).getTime() : Date.now(),
          });

          // Upgrade user
          await ctx.runMutation(internal.users.upgradeUserType, {
            messengerId: payment.messengerId,
            newType: payment.plan,
          });

          // Send confirmation
          const accessToken = process.env.ACCESS_TOKEN;
          if (accessToken && payment.messengerId) {
            const planName = payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1);
            const benefits = payment.plan === "mystic" 
              ? "- 5 daily tarot readings\n- Unlimited follow-up questions\n- Deeper mystical insights" 
              : "- Unlimited daily tarot readings\n- Unlimited follow-up questions\n- Advanced oracle guidance";
            const confirmationMessage = `🎉 Congratulations! You've successfully upgraded to ${planName} Plan! ✨

Your new benefits:
${benefits}

Enjoy your enhanced mystical experience! 🔮

Ready to start your first reading?`;
            await sendTextMessage(payment.messengerId, confirmationMessage, accessToken, [
              { title: "🎴 Start Reading", payload: "Start" },
              { title: "ℹ️ About Me", payload: "About Me" }
            ]);
          }
        } else if (payment) {
          console.log("Payment already processed or not pending:", payment.status);
        } else {
          console.error("Payment not found for external_id:", externalId);
        }
      } else if (["EXPIRED", "FAILED"].some(s => s.toUpperCase() === event.status.toUpperCase())) {
        // Update status for other events
        const externalId = event.external_id;
        await ctx.runMutation(internal.payments.updatePaymentStatus, {
          externalId,
          status: event.status.toUpperCase() as 'EXPIRED' | 'FAILED',
        });
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Internal server error", { status: 500 });
    }
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

function isGreeting(text: string): boolean {
  const greetingWords = [
    'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon',
    'good evening', 'sup', 'yo', 'hiya', 'howdy', 'aloha', 'bonjour',
    'hola', 'ciao', 'namaste', 'salam', 'shalom', 'konnichiwa'
  ];

  const lowerText = text.toLowerCase().trim();

  // Check for exact matches
  if (greetingWords.includes(lowerText)) {
    return true;
  }

  // Check for greetings with punctuation
  if (greetingWords.some(word => lowerText.startsWith(word))) {
    return true;
  }

  // Check for common greeting patterns
  if (lowerText.match(/^(hi|hello|hey|sup|yo)\b/)) {
    return true;
  }

  return false;
}

async function sendTextMessage(recipientId: string, text: string, accessToken: string, quickReplies?: Array<{title: string, payload: string}>): Promise<void> {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;
  const message: FacebookMessageData["message"] = { text };
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

async function sendImageMessage(ctx: ActionCtx, recipientId: string, imageFilename: string, caption: string, accessToken: string): Promise<void> {
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

async function sendMultipleImageMessage(ctx: ActionCtx, recipientId: string, images: Array<{filename: string, reversed: boolean}>, accessToken: string): Promise<void> {
  try {
    // Get cached attachment IDs directly from database (much faster!)
    const attachmentIds = await ctx.runQuery(api.tarotCardImages.getAttachmentIdsForCards, {
      cards: images.map(img => ({ filename: img.filename, reversed: img.reversed }))
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
      console.log("Successfully sent multiple images using cached attachment IDs");
    }
  } catch (error) {
    console.error("Error in sendMultipleImageMessage:", error);
    // Fallback to the old action-based approach if cached IDs aren't available
    try {
      console.log("Falling back to action-based image upload...");
      const attachmentIds = await ctx.runAction(api.imageActions.uploadMultipleImageAttachments, {
        images,
        accessToken
      });

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
        throw new Error(`Failed to send multiple images: ${res.status}`);
      }

      console.log("Successfully sent multiple images via fallback method");
    } catch (fallbackError) {
      console.error("Fallback method also failed:", fallbackError);
      // Final fallback: send images individually
      for (const image of images) {
        await sendImageMessage(ctx, recipientId, image.filename, "", accessToken);
      }
    }
  }
}

