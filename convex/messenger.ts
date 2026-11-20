// The Messenger conversation. convex/http.ts verifies and acknowledges each webhook
// within Meta's 5-second limit, then schedules handleEvents here with one sender's
// events in timestamp order.
//
// State lives on the user (sessionState) and, for follow-ups, on their latest reading:
//   (none) -> wants a reading -> waiting_birthdate (first time only) -> waiting_question
//   waiting_question -> their question -> reading_in_progress -> reading_complete (5 s)
//   reading done -> follow-up window on the reading for 10 minutes
//
// Each step has its own handler. Buttons are read by payload. Typed text is read by Jev
// (convex/ai/jev.ts), which says what the message means at that step; the handler acts on
// it only above a threshold and otherwise keeps the older keyword behaviour. Every reply
// still carries buttons, so tapping and typing both work.

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  FOLLOWUP_MESSAGES,
  FOLLOWUP_QUICK_REPLIES,
  FOLLOWUP_WINDOW_MS,
  MESSAGES,
  QUESTION_TOPIC_REPLIES,
  QUICK_REPLIES,
  UPGRADE_REPLIES,
  formatCardSummary,
  getDailyLimitMessage,
} from "./constants";
import { generateFollowupAnswer, generateReading } from "./ai/gemini";
import { readEmotion, readMessage, type EmotionResult } from "./ai/jev";
import { toneGuidelines } from "./ai/prompts";
import { buildReadingMemoryContext } from "./embeddings";
import { isCancel, isGreeting, parseBirthdate } from "./lib/intents";
import {
  QUICK_REPLY_PAYLOAD_MAX,
  fetchSenderViaMessage,
  fetchUserProfile,
  getPageAccessToken,
  sendImages,
  sendText,
  type QuickReply,
} from "./lib/messenger";
import { fullName, truncate } from "./lib/text";
import { timeUntilNextDay } from "./lib/time";
import { startCheckout } from "./payments";
import { drawThreeCards, toStoredCard, type DrawnCard } from "./tarot";
import { buildProfileMessage } from "./users";
import { inboundEventValidator, type InboundEvent } from "./validators";

// Jev thresholds: the probability of the chosen intent needed to act on it. Tuned on 49
// English and Taglish messages where right answers scored 0.88-1.00 (see convex/ai/jev.ts).
const ACT_ON_INTENT = 0.6; // open a menu, explain, greet, re-ask
const START_READING_DIRECTLY = 0.8; // idle text becomes a reading: uses up the day's reading
const DIVERT_FROM_QUESTION = 0.7; // at the question step, treat the text as something other than the question
const LEAVE_FOLLOWUP = 0.8; // in the follow-up window, treat the text as something other than a question

export const handleEvents = internalAction({
  args: { events: v.array(inboundEventValidator) },
  handler: async (ctx, args) => {
    const accessToken = getPageAccessToken();
    if (!accessToken) {
      console.error("ACCESS_TOKEN is not set; dropping Messenger events");
      return;
    }
    for (const event of args.events) {
      const isNew = await ctx.runMutation(internal.webhookEvents.claim, {
        eventKey: event.eventKey,
        senderId: event.senderId,
        timestamp: event.timestamp,
      });
      if (!isNew) continue; // Meta retried a delivery we already handled
      try {
        await handleEvent(ctx, event, accessToken);
      } catch (error) {
        console.error("Messenger event failed", error);
        await sendText(event.senderId, MESSAGES.genericError, accessToken);
      }
    }
  },
});

async function handleEvent(ctx: ActionCtx, event: InboundEvent, accessToken: string): Promise<void> {
  const { senderId, payload } = event;

  if (payload === "UPGRADE_MYSTIC" || payload === "UPGRADE_ORACLE") {
    await startCheckout(ctx, accessToken, { messengerId: senderId, plan: payload === "UPGRADE_MYSTIC" ? "mystic" : "oracle" });
    return;
  }
  if (payload === "GET_STARTED") {
    await handleGetStarted(ctx, senderId, accessToken);
    return;
  }

  const state = await ctx.runQuery(internal.users.getSessionState, { messengerId: senderId });
  switch (state) {
    case "followup_available":
    case "followup_in_progress":
      return await onFollowupStep(ctx, event, accessToken);
    case "reading_in_progress":
      await sendText(senderId, MESSAGES.stillReading, accessToken);
      return;
    case "reading_complete":
      await sendText(senderId, MESSAGES.readingTooFresh, accessToken);
      return;
    case "waiting_birthdate":
      return await onBirthdateStep(ctx, event, accessToken);
    case "waiting_question":
      return await onQuestionStep(ctx, event, accessToken);
    default:
      return await onIdle(ctx, event, accessToken);
  }
}

// Steps --------------------------------------------------------------------------

/** No session. */
async function onIdle(ctx: ActionCtx, event: InboundEvent, accessToken: string): Promise<void> {
  const { senderId, input, payload } = event;

  if (!payload && input) {
    const { intent, emotion } = await readMessage("idle", input);
    if (intent && intent.probability >= ACT_ON_INTENT) {
      switch (intent.intent) {
        case "tarot_question":
          // "Will my ex come back?" reads straight away instead of asking them to tap Start and retype.
          if (intent.probability >= START_READING_DIRECTLY) return await readTypedQuestion(ctx, event, accessToken, emotion);
          break;
        case "start_reading":
          return await handleStart(ctx, senderId, accessToken);
        case "about_me":
          return await sendProfile(ctx, senderId, accessToken);
        case "upgrade":
          return await showUpgradeOptions(ctx, senderId, accessToken);
        case "how_it_works":
          await sendText(senderId, MESSAGES.howItWorks, accessToken, [QUICK_REPLIES.start, QUICK_REPLIES.aboutMe]);
          return;
        case "greeting":
          return await sendWelcome(ctx, senderId, accessToken);
        case "other":
          break;
      }
    }
  }

  // Buttons, and typed text Jev was unsure of or couldn't read.
  const lower = input.toLowerCase();
  if (lower.includes("upgrade")) return await showUpgradeOptions(ctx, senderId, accessToken);
  if (isGreeting(input)) return await sendWelcome(ctx, senderId, accessToken);
  if (lower.includes("about me")) return await sendProfile(ctx, senderId, accessToken);
  if (lower.includes("quick question")) {
    await sendText(senderId, MESSAGES.quickQuestion, accessToken, [QUICK_REPLIES.start, QUICK_REPLIES.aboutMe]);
    return;
  }
  if (lower.includes("daily insight")) {
    await sendText(senderId, MESSAGES.dailyInsight, accessToken, [
      QUICK_REPLIES.start,
      QUICK_REPLIES.guidance,
      QUICK_REPLIES.aboutMe,
    ]);
    return;
  }
  if (lower.includes("start")) return await handleStart(ctx, senderId, accessToken);
  await sendText(senderId, MESSAGES.readyForReading, accessToken, [QUICK_REPLIES.start, QUICK_REPLIES.aboutMe]);
}

/** The bot asked for their birthdate. */
async function onBirthdateStep(ctx: ActionCtx, event: InboundEvent, accessToken: string): Promise<void> {
  const { senderId, input, payload } = event;
  if (isCancel(input)) return await cancelSession(ctx, senderId, accessToken);
  if (payload === "Start") {
    await sendText(senderId, MESSAGES.promptBirthdate, accessToken);
    return;
  }
  if (payload === "About Me") return await sendProfile(ctx, senderId, accessToken);

  const birthdate = parseBirthdate(input);
  if (birthdate) return await acceptBirthdate(ctx, event, birthdate, accessToken);

  if (!payload && input) {
    const { intent } = await readMessage("birthdate", input);
    if (intent && intent.probability >= ACT_ON_INTENT) {
      switch (intent.intent) {
        case "asks_why":
          await sendText(senderId, MESSAGES.birthdateWhy, accessToken);
          return;
        case "tarot_question":
          // Keep the question and read it the moment the birthdate arrives.
          await ctx.runMutation(internal.users.holdQuestionForBirthdate, { messengerId: senderId, question: input });
          await sendText(senderId, MESSAGES.questionHeld, accessToken);
          return;
        case "about_me":
          return await sendProfile(ctx, senderId, accessToken);
        case "upgrade":
          return await showUpgradeOptions(ctx, senderId, accessToken);
        case "wants_to_stop":
          return await cancelSession(ctx, senderId, accessToken);
        case "small_talk":
          await sendText(senderId, MESSAGES.promptBirthdate, accessToken);
          return;
        case "gives_birthdate":
          break; // a date we couldn't parse: show the format
      }
    }
  }
  await sendText(senderId, MESSAGES.invalidBirthdate, accessToken);
}

/** The bot asked what they want the cards to answer. */
async function onQuestionStep(ctx: ActionCtx, event: InboundEvent, accessToken: string): Promise<void> {
  const { senderId, input, payload } = event;
  if (isCancel(input)) return await cancelSession(ctx, senderId, accessToken);
  if (payload === "Start") return await askForQuestion(senderId, accessToken);
  if (payload === "About Me") return await sendProfile(ctx, senderId, accessToken);

  // A topic button is always a question. Typed text is a question unless Jev is fairly
  // sure it isn't: a wrong guess here would spend the day's reading on "ok".
  let emotion: EmotionResult | null | undefined;
  if (!payload && input) {
    const read = await readMessage("question", input);
    emotion = read.emotion;
    const { intent } = read;
    if (intent && intent.intent !== "tarot_question" && intent.probability >= DIVERT_FROM_QUESTION) {
      switch (intent.intent) {
        case "about_me":
          return await sendProfile(ctx, senderId, accessToken);
        case "upgrade":
          return await showUpgradeOptions(ctx, senderId, accessToken);
        case "wants_to_stop":
          return await cancelSession(ctx, senderId, accessToken);
        case "small_talk":
          return await askForQuestion(senderId, accessToken);
      }
    }
  }
  if (input) await handleQuestion(ctx, event, accessToken, emotion);
}

/** The 10-minute follow-up window after a reading. */
async function onFollowupStep(ctx: ActionCtx, event: InboundEvent, accessToken: string): Promise<void> {
  const { senderId, input, payload } = event;
  if (payload === "Start" || isCancel(input)) {
    const reading = await ctx.runQuery(internal.followups.getOpenReading, { messengerId: senderId });
    if (reading) await ctx.runMutation(internal.followups.endSession, { readingId: reading._id });
    if (payload === "Start") return await handleStart(ctx, senderId, accessToken);
    await sendText(senderId, FOLLOWUP_MESSAGES.sessionEnded, accessToken, [QUICK_REPLIES.startReading]);
    return;
  }
  await handleFollowup(ctx, event, accessToken);
}

// Replies --------------------------------------------------------------------------

/** A typed question with no session: read it now, or hold it until we have the birthdate. */
async function readTypedQuestion(
  ctx: ActionCtx,
  event: InboundEvent,
  accessToken: string,
  emotion: EmotionResult | null,
): Promise<void> {
  const { senderId, input } = event;
  if (!(await ctx.runQuery(internal.users.canReadToday, { messengerId: senderId }))) {
    return await sendDailyLimit(ctx, senderId, accessToken);
  }
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });
  if (!user?.birthdate) {
    await ctx.runMutation(internal.users.holdQuestionForBirthdate, { messengerId: senderId, question: input });
    await sendText(senderId, MESSAGES.questionHeld, accessToken);
    return;
  }
  await ctx.runMutation(internal.users.setSessionState, { messengerId: senderId, sessionState: "waiting_question" });
  await handleQuestion(ctx, event, accessToken, emotion);
}

async function acceptBirthdate(ctx: ActionCtx, event: InboundEvent, birthdate: string, accessToken: string): Promise<void> {
  const { senderId } = event;
  const heldQuestion = await ctx.runMutation(internal.users.acceptBirthdate, { messengerId: senderId, birthdate });
  if (heldQuestion) {
    await sendText(senderId, MESSAGES.birthdateSaved, accessToken);
    await handleQuestion(ctx, { ...event, input: heldQuestion, payload: undefined }, accessToken);
    return;
  }
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });
  await sendText(
    senderId,
    `${MESSAGES.birthdateSaved}\n\n${MESSAGES.askQuestionAfterBirthdate(fullName(user))}`,
    accessToken,
    QUESTION_TOPIC_REPLIES,
  );
}

async function askForQuestion(senderId: string, accessToken: string): Promise<void> {
  await sendText(senderId, MESSAGES.askQuestion, accessToken, QUESTION_TOPIC_REPLIES);
}

async function cancelSession(ctx: ActionCtx, senderId: string, accessToken: string): Promise<void> {
  await ctx.runMutation(internal.users.endSession, { messengerId: senderId });
  await sendText(senderId, MESSAGES.sessionCancelled, accessToken, [QUICK_REPLIES.start, QUICK_REPLIES.aboutMe]);
}

async function sendWelcome(ctx: ActionCtx, senderId: string, accessToken: string): Promise<void> {
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });
  const name = fullName(user);
  await sendText(senderId, name ? MESSAGES.welcomeBack(name) : MESSAGES.readyForReading, accessToken, [
    QUICK_REPLIES.start,
    QUICK_REPLIES.aboutMe,
  ]);
}

async function handleGetStarted(ctx: ActionCtx, senderId: string, accessToken: string): Promise<void> {
  const profile = await fetchUserProfile(senderId, accessToken);
  await ctx.runMutation(internal.users.saveProfile, {
    messengerId: senderId,
    firstName: profile?.first_name,
    lastName: profile?.last_name,
  });
  const name = profile?.first_name || profile?.name?.split(" ")[0];
  await sendText(senderId, name ? MESSAGES.getStartedWelcomeNamed(name) : MESSAGES.getStartedWelcome, accessToken, [
    QUICK_REPLIES.start,
    QUICK_REPLIES.quickQuestion,
    QUICK_REPLIES.aboutMe,
  ]);
}

async function showUpgradeOptions(ctx: ActionCtx, senderId: string, accessToken: string): Promise<void> {
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });
  if (user && user.userType !== "free") {
    const profile = await buildProfileMessage(ctx, senderId);
    await sendText(senderId, `${profile}\n\n${MESSAGES.upgradeAlreadySubscribed}`, accessToken, [
      QUICK_REPLIES.aboutMe,
      QUICK_REPLIES.startReading,
    ]);
    return;
  }
  await sendText(senderId, MESSAGES.upgradeChoosePlan, accessToken, UPGRADE_REPLIES);
}

async function sendProfile(ctx: ActionCtx, senderId: string, accessToken: string): Promise<void> {
  const [profile, user] = await Promise.all([
    buildProfileMessage(ctx, senderId),
    ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId }),
  ]);
  const replies = !user || user.userType === "free" ? [...UPGRADE_REPLIES, QUICK_REPLIES.start] : [QUICK_REPLIES.start];
  await sendText(senderId, profile, accessToken, replies);
}

async function sendDailyLimit(ctx: ActionCtx, senderId: string, accessToken: string): Promise<void> {
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });
  const tier = user?.userType ?? "free";
  await sendText(senderId, getDailyLimitMessage(timeUntilNextDay(), tier), accessToken, tier === "free" ? UPGRADE_REPLIES : []);
}

async function handleStart(ctx: ActionCtx, senderId: string, accessToken: string): Promise<void> {
  if (!(await ctx.runQuery(internal.users.canReadToday, { messengerId: senderId }))) {
    await sendDailyLimit(ctx, senderId, accessToken);
    return;
  }
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });
  if (!user?.birthdate) {
    await ctx.runMutation(internal.users.setSessionState, { messengerId: senderId, sessionState: "waiting_birthdate" });
    await sendText(senderId, MESSAGES.promptBirthdate, accessToken);
    return;
  }
  await ctx.runMutation(internal.users.setSessionState, { messengerId: senderId, sessionState: "waiting_question" });
  await sendText(
    senderId,
    fullName(user) ? MESSAGES.askQuestion : MESSAGES.askQuestionWelcome,
    accessToken,
    QUESTION_TOPIC_REPLIES,
  );
}

// The reading -------------------------------------------------------------------

async function handleQuestion(
  ctx: ActionCtx,
  event: InboundEvent,
  accessToken: string,
  knownEmotion?: EmotionResult | null,
): Promise<void> {
  const { senderId, input: question } = event;

  if (!(await ctx.runQuery(internal.users.canReadToday, { messengerId: senderId }))) {
    await ctx.runMutation(internal.users.endSession, { messengerId: senderId });
    await sendDailyLimit(ctx, senderId, accessToken);
    return;
  }
  if (!(await ctx.runMutation(internal.users.beginReading, { messengerId: senderId }))) return;

  await sendText(senderId, MESSAGES.readingInProgress, accessToken);
  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });

  const [emotion, memoryContext] = await Promise.all([
    knownEmotion !== undefined ? Promise.resolve(knownEmotion) : readEmotion(question),
    user ? buildReadingMemoryContext(ctx, user._id, question) : Promise.resolve(""),
  ]);
  if (emotion) await ctx.runMutation(internal.users.updateLastEmotion, { messengerId: senderId, emotionLabel: emotion.label });

  const cards = drawThreeCards();
  let interpretation: string;
  try {
    interpretation = await generateReading({
      question,
      cards,
      userName: fullName(user),
      userBirthdate: user?.birthdate,
      emotionTone: emotion ? toneGuidelines(emotion.label) : undefined,
      memoryContext: memoryContext || undefined,
    });
  } catch (error) {
    console.error("Reading generation failed", error);
    await ctx.runMutation(internal.users.reopenQuestion, { messengerId: senderId });
    await sendText(senderId, MESSAGES.readingFailed, accessToken, [
      QUICK_REPLIES.tryAgain(truncate(question, QUICK_REPLY_PAYLOAD_MAX)),
    ]);
    return;
  }

  const profile = fullName(user) ? null : await lookUpName(senderId, event.messageId, accessToken);
  const userId = await ctx.runMutation(internal.users.saveProfile, {
    messengerId: senderId,
    firstName: profile?.first_name,
    lastName: profile?.last_name,
  });
  const readingId = await ctx.runMutation(internal.readings.createReading, {
    userId,
    messengerId: senderId,
    question,
    cards: cards.map(toStoredCard),
    interpretation,
    readingType: "daily",
    emotionLabel: emotion?.label,
    emotionScores: emotion?.scores,
  });
  await ctx.runMutation(internal.users.markReadingDone, { messengerId: senderId });

  await sendCardImages(ctx, senderId, cards, accessToken);
  await sendText(senderId, cards.map(formatCardSummary).join("\n\n"), accessToken);
  await sendText(senderId, MESSAGES.cardsDrawn, accessToken);
  await sendText(senderId, `${interpretation}${MESSAGES.readingComplete}`, accessToken);

  await ctx.runMutation(internal.followups.startSession, { readingId });
  await sendText(senderId, FOLLOWUP_MESSAGES.prompt, accessToken, [FOLLOWUP_QUICK_REPLIES.endSession]);
  await ctx.scheduler.runAfter(FOLLOWUP_WINDOW_MS, internal.followups.autoEndFollowupSession, {
    readingId,
    messengerId: senderId,
  });
}

async function lookUpName(senderId: string, messageId: string | undefined, accessToken: string) {
  return (
    (await fetchUserProfile(senderId, accessToken)) ?? (messageId ? await fetchSenderViaMessage(messageId, accessToken) : null)
  );
}

async function sendCardImages(ctx: ActionCtx, senderId: string, cards: DrawnCard[], accessToken: string): Promise<void> {
  const wanted = cards.map((card) => ({ filename: card.imageFilename, reversed: card.reversed }));
  let attachmentIds: Array<string | null> = await ctx.runQuery(internal.tarotCardImages.getAttachmentIds, { cards: wanted });
  if (attachmentIds.some((id) => id === null)) {
    try {
      attachmentIds = await ctx.runAction(internal.imageActions.ensureAttachmentIds, { cards: wanted });
    } catch (error) {
      console.error("Could not upload card images; sending the text only", error);
      return;
    }
  }
  if (!(await sendImages(senderId, attachmentIds as string[], accessToken))) console.error("Card images failed to send");
}

// Follow-ups --------------------------------------------------------------------

async function handleFollowup(ctx: ActionCtx, event: InboundEvent, accessToken: string): Promise<void> {
  const { senderId, input, payload } = event;
  const reading = await ctx.runQuery(internal.followups.getOpenReading, { messengerId: senderId });
  if (!reading) {
    await sendText(senderId, FOLLOWUP_MESSAGES.noSession, accessToken);
    return;
  }
  const isFree = reading.subscriptionTier === "free";

  if (payload === "FOLLOWUP_QUESTION") {
    await sendText(senderId, FOLLOWUP_MESSAGES.prompt, accessToken, [FOLLOWUP_QUICK_REPLIES.endSession]);
    return;
  }
  if (payload === "END_READING_SESSION") {
    await ctx.runMutation(internal.followups.endSession, { readingId: reading._id });
    await sendText(senderId, FOLLOWUP_MESSAGES.sessionEnded, accessToken, [QUICK_REPLIES.startReading]);
    return;
  }
  if (payload === "UPGRADE_PROMPT") {
    await sendText(senderId, FOLLOWUP_MESSAGES.upgradePrompt, accessToken, isFree ? UPGRADE_REPLIES : []);
    return;
  }
  if (!input) return;

  // Typed text: "thanks!", "bye" or "draw new cards" shouldn't use up a question and a Gemini call.
  let emotion: EmotionResult | null = null;
  if (!payload) {
    const read = await readMessage("followup", input, reading.question);
    emotion = read.emotion;
    const { intent } = read;
    if (intent && intent.intent !== "followup_question" && intent.probability >= LEAVE_FOLLOWUP) {
      switch (intent.intent) {
        case "thanks": {
          const remaining = reading.maxFollowups - reading.followupsUsed;
          await sendText(
            senderId,
            FOLLOWUP_MESSAGES.thanksReply,
            accessToken,
            remaining > 0
              ? [FOLLOWUP_QUICK_REPLIES.askQuestion, FOLLOWUP_QUICK_REPLIES.endSession]
              : [FOLLOWUP_QUICK_REPLIES.endSession],
          );
          return;
        }
        case "wants_to_end":
          await ctx.runMutation(internal.followups.endSession, { readingId: reading._id });
          await sendText(senderId, FOLLOWUP_MESSAGES.sessionEnded, accessToken, [QUICK_REPLIES.startReading]);
          return;
        case "wants_new_reading":
          await ctx.runMutation(internal.followups.endSession, { readingId: reading._id });
          await handleStart(ctx, senderId, accessToken);
          return;
        case "about_me":
          await sendProfile(ctx, senderId, accessToken); // the window stays open
          return;
        case "upgrade":
          await showUpgradeOptions(ctx, senderId, accessToken);
          return;
      }
    }
  }

  const slot = await ctx.runMutation(internal.followups.reserveQuestion, { readingId: reading._id });
  if (slot.status === "limit") {
    await sendText(
      senderId,
      FOLLOWUP_MESSAGES.limitReached,
      accessToken,
      isFree ? UPGRADE_REPLIES : [FOLLOWUP_QUICK_REPLIES.endSession],
    );
    return;
  }
  if (slot.status === "closed") {
    await sendText(senderId, FOLLOWUP_MESSAGES.noSession, accessToken);
    return;
  }

  const user = await ctx.runQuery(internal.users.getUserByMessengerId, { messengerId: senderId });
  if (emotion) await ctx.runMutation(internal.users.updateLastEmotion, { messengerId: senderId, emotionLabel: emotion.label });

  const startedAt = Date.now();
  let answer: string;
  try {
    answer = await generateFollowupAnswer({
      question: input,
      cards: reading.cards,
      reading: reading.interpretation,
      earlierAnswers: earlierAnswers(reading),
      userName: fullName(user),
      emotionTone: emotion ? toneGuidelines(emotion.label) : undefined,
    });
  } catch (error) {
    console.error("Follow-up generation failed", error);
    await ctx.runMutation(internal.followups.releaseQuestion, { readingId: reading._id });
    await sendText(senderId, FOLLOWUP_MESSAGES.answerFailed, accessToken, [FOLLOWUP_QUICK_REPLIES.endSession]);
    return;
  }

  await ctx.runMutation(internal.followups.recordAnswer, {
    readingId: reading._id,
    question: input,
    answer,
    questionNumber: slot.questionNumber,
    responseTime: Date.now() - startedAt,
  });
  const replies: QuickReply[] =
    slot.remaining > 0
      ? [FOLLOWUP_QUICK_REPLIES.askQuestion, FOLLOWUP_QUICK_REPLIES.endSession]
      : isFree
        ? [FOLLOWUP_QUICK_REPLIES.upgradePrompt, FOLLOWUP_QUICK_REPLIES.endSession]
        : [FOLLOWUP_QUICK_REPLIES.endSession];
  await sendText(senderId, answer, accessToken, replies);
}

function earlierAnswers(reading: Doc<"readings">): string[] {
  return (reading.conversationHistory ?? [])
    .filter((entry) => entry.type === "followup_response" && entry.content.length > 0)
    .map((entry) => entry.content);
}
