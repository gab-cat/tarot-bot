import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { EMBEDDING_DIMENSIONS } from "./ai/models";
import {
  conversationEntryValidator,
  emotionScoresValidator,
  paidPlanValidator,
  paymentStatusValidator,
  readingSessionStateValidator,
  readingTypeValidator,
  storedCardValidator,
  userSessionStateValidator,
  userTierValidator,
} from "./validators";

export default defineSchema({
  users: defineTable({
    messengerId: v.string(), // Page-scoped id (PSID)
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    birthdate: v.optional(v.string()), // "Mon D", e.g. "Oct 15"
    isSubscribed: v.boolean(),
    userType: userTierValidator,
    createdAt: v.number(),
    lastActiveAt: v.number(),
    // Last message the user sent us. Messenger only allows standard messages within
    // 24 hours of this, so broadcasts filter on it.
    lastMessageAt: v.optional(v.number()),
    lastReadingDate: v.optional(v.number()),
    readingCount: v.optional(v.number()), // Missing on old rows until their next reading
    sessionState: v.optional(userSessionStateValidator),
    // A question asked before we had their birthdate; read as soon as the birthdate arrives.
    pendingQuestion: v.optional(v.string()),
    description: v.optional(v.string()), // AI profile blurb shown in "About me"
    descriptionLastUpdated: v.optional(v.number()),
    // Legacy: written but never enforced. Kept so old rows still validate.
    followupSessionsToday: v.optional(v.number()),
    lastFollowupAt: v.optional(v.number()),
    scheduledNotificationId: v.optional(v.id("_scheduled_functions")),
    subscriptionStartAt: v.optional(v.number()),
    subscriptionExpiresAt: v.optional(v.number()),
    scheduledDowngradeId: v.optional(v.id("_scheduled_functions")),
    lastEmotionLabel: v.optional(v.string()),
    lastEmotionAt: v.optional(v.number()),
  })
    .index("by_messenger_id", ["messengerId"])
    .index("by_last_message", ["lastMessageAt"]),

  readings: defineTable({
    userId: v.id("users"),
    messengerId: v.string(),
    question: v.optional(v.string()),
    cards: v.array(storedCardValidator),
    interpretation: v.string(),
    readingType: readingTypeValidator,
    createdAt: v.number(),
    sessionState: readingSessionStateValidator,
    subscriptionTier: userTierValidator,
    maxFollowups: v.number(),
    followupsUsed: v.number(),
    conversationHistory: v.optional(v.array(conversationEntryValidator)),
    lastActivityAt: v.number(),
    // Legacy: embeddings now live in `readingEmbeddings`. `migrations:backfillReadingEmbeddings`
    // clears this field; drop it from the schema once that has run on prod.
    embedding: v.optional(v.array(v.float64())),
    emotionLabel: v.optional(v.string()),
    emotionScores: v.optional(emotionScoresValidator),
  }).index("by_user", ["userId"]),

  // Kept apart from `readings` so reading a reading never loads a 1536-float vector.
  readingEmbeddings: defineTable({
    readingId: v.id("readings"),
    userId: v.id("users"),
    embedding: v.array(v.float64()),
  })
    .index("by_reading", ["readingId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSIONS,
      filterFields: ["userId"],
    }),

  // One row per Messenger event we have accepted. Meta retries deliveries, so this is
  // how a retry is told apart from a new message. Rows older than 7 days are purged.
  webhookEvents: defineTable({
    eventKey: v.string(),
  }).index("by_event_key", ["eventKey"]),

  tarotCards: defineTable({
    cardId: v.string(),
    name: v.string(),
    arcana: v.union(v.literal("major"), v.literal("minor")),
    meaningUpright: v.string(),
    meaningReversed: v.string(),
    description: v.string(),
    keywords: v.array(v.string()),
  }).index("by_card_id", ["cardId"]),

  // Messenger attachment ids for each card image, uploaded once and reused.
  tarotCardImages: defineTable({
    cardId: v.string(),
    imageFilename: v.string(),
    uprightAttachmentId: v.string(),
    reversedAttachmentId: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_card_id", ["cardId"])
    .index("by_filename", ["imageFilename"]),

  payments: defineTable({
    externalId: v.string(),
    invoiceId: v.optional(v.string()),
    messengerId: v.string(),
    plan: paidPlanValidator,
    amount: v.number(),
    currency: v.string(),
    status: paymentStatusValidator,
    invoiceUrl: v.optional(v.string()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  }).index("by_external_id", ["externalId"]),

  promotionalPeriods: defineTable({
    startDate: v.number(),
    endDate: v.number(),
    targetedUserIds: v.optional(v.array(v.string())), // Messenger ids
    targetedUserTypes: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    createdAt: v.number(),
    deactivatedAt: v.optional(v.number()),
    scheduledEndJobId: v.optional(v.string()),
  }).index("by_active", ["isActive"]),
});
