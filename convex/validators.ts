import { v, type Infer } from "convex/values";

// "pro" and "pro+" are legacy names for "mystic" and "oracle". Old rows still use them.
export const userTierValidator = v.union(
  v.literal("free"),
  v.literal("mystic"),
  v.literal("oracle"),
  v.literal("pro"),
  v.literal("pro+"),
);
export type UserTier = Infer<typeof userTierValidator>;

export const paidPlanValidator = v.union(v.literal("mystic"), v.literal("oracle"));
export type PaidPlan = Infer<typeof paidPlanValidator>;

export const userSessionStateValidator = v.union(
  v.literal("waiting_question"),
  v.literal("reading_in_progress"),
  v.literal("reading_complete"),
  v.literal("waiting_birthdate"),
  v.literal("followup_available"),
  v.literal("followup_in_progress"),
);
export type UserSessionState = Infer<typeof userSessionStateValidator>;

export const readingSessionStateValidator = v.union(
  v.literal("active"),
  v.literal("followup_available"),
  v.literal("followup_in_progress"),
  v.literal("completed"),
  v.literal("ended"),
);

export const readingTypeValidator = v.union(v.literal("daily"), v.literal("question"), v.literal("manual"));

export const storedCardValidator = v.object({
  id: v.string(),
  name: v.string(),
  meaning: v.string(),
  position: v.string(),
  reversed: v.boolean(),
  description: v.string(),
  cardType: v.string(),
});
export type StoredCard = Infer<typeof storedCardValidator>;

export const conversationEntryValidator = v.object({
  type: v.union(
    v.literal("initial_reading"),
    v.literal("followup_question"),
    v.literal("followup_response"),
    v.literal("session_end"),
  ),
  timestamp: v.number(),
  content: v.string(),
  questionNumber: v.optional(v.number()),
  responseTime: v.optional(v.number()),
  isValidQuestion: v.optional(v.boolean()),
});
export type ConversationEntry = Infer<typeof conversationEntryValidator>;

export const emotionLabelValidator = v.union(
  v.literal("anxious"),
  v.literal("sad"),
  v.literal("neutral"),
  v.literal("hopeful"),
  v.literal("angry"),
  v.literal("confused"),
);
export type EmotionLabel = Infer<typeof emotionLabelValidator>;

export const emotionScoresValidator = v.object({
  anxious: v.optional(v.number()),
  sad: v.optional(v.number()),
  neutral: v.optional(v.number()),
  hopeful: v.optional(v.number()),
  angry: v.optional(v.number()),
  confused: v.optional(v.number()),
});

export const paymentStatusValidator = v.union(v.literal("PENDING"), v.literal("PAID"), v.literal("EXPIRED"), v.literal("FAILED"));

/** One Messenger webhook event, already normalised by `convex/http.ts`. */
export const inboundEventValidator = v.object({
  eventKey: v.string(),
  senderId: v.string(),
  timestamp: v.number(),
  // Quick reply or postback payload when there is one, otherwise the typed text. Trimmed.
  input: v.string(),
  payload: v.optional(v.string()),
  messageId: v.optional(v.string()),
});
export type InboundEvent = Infer<typeof inboundEventValidator>;
