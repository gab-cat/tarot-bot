import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    messengerId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    birthdate: v.optional(v.string()), // Format: "Month DD" (e.g., "Oct 15", "Dec 2")
    isSubscribed: v.boolean(),
    userType: v.union(v.literal("free"), v.literal("mystic"), v.literal("oracle"), v.literal("pro"), v.literal("pro+")),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    lastReadingDate: v.optional(v.number()), // Unix timestamp for last daily reading
    sessionState: v.optional(v.union(v.literal("waiting_question"), v.literal("reading_in_progress"), v.literal("reading_complete"), v.literal("waiting_birthdate"), v.literal("followup_available"), v.literal("followup_in_progress"))),
    description: v.optional(v.string()), // AI-generated user description
    descriptionLastUpdated: v.optional(v.number()), // Unix timestamp when description was last updated
    followupSessionsToday: v.optional(v.number()), // Count of follow-up sessions used today
    lastFollowupAt: v.optional(v.number()), // Unix timestamp of last follow-up interaction
    scheduledNotificationId: v.optional(v.id("_scheduled_functions")), // ID of scheduled notification job for daily reading availability
  }).index("by_messenger_id", ["messengerId"]),

  readings: defineTable({
    userId: v.id("users"),
    messengerId: v.string(),
    question: v.optional(v.string()),
    cards: v.array(v.object({
      id: v.string(),
      name: v.string(),
      meaning: v.string(),
      position: v.string(),
      reversed: v.boolean(),
      description: v.string(),
      cardType: v.string(),
    })),
    interpretation: v.string(),
    readingType: v.union(v.literal("daily"), v.literal("question"), v.literal("manual")),
    createdAt: v.number(),
    sessionState: v.union(v.literal("active"), v.literal("followup_available"), v.literal("followup_in_progress"), v.literal("completed"), v.literal("ended")),
    subscriptionTier: v.union(v.literal("free"), v.literal("mystic"), v.literal("oracle"), v.literal("pro"), v.literal("pro+")),
    maxFollowups: v.number(), // 1, 3, or 5
    followupsUsed: v.number(), // counter of follow-up questions asked
    conversationHistory: v.optional(v.array(
      v.object({
        type: v.union(v.literal("initial_reading"), v.literal("followup_question"), v.literal("followup_response"), v.literal("session_end")),
        timestamp: v.number(),
        content: v.string(),
        questionNumber: v.optional(v.number()),
        responseTime: v.optional(v.number()),
        isValidQuestion: v.optional(v.boolean()),
      })
    )),
    lastActivityAt: v.number(),
  }).index("by_user", ["userId"]),

  tarotCards: defineTable({
    cardId: v.string(),
    name: v.string(),
    arcana: v.union(v.literal("major"), v.literal("minor")),
    meaningUpright: v.string(),
    meaningReversed: v.string(),
    description: v.string(),
    keywords: v.array(v.string()),
  }).index("by_card_id", ["cardId"]),

  tarotCardImages: defineTable({
    cardId: v.string(),
    imageFilename: v.string(),
    uprightAttachmentId: v.string(),
    reversedAttachmentId: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.number(),
  }).index("by_card_id", ["cardId"]).index("by_filename", ["imageFilename"]),

  payments: defineTable({
    externalId: v.string(),
    invoiceId: v.optional(v.string()),
    messengerId: v.string(),
    plan: v.union(v.literal("mystic"), v.literal("oracle")),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("PENDING"), v.literal("PAID"), v.literal("EXPIRED"), v.literal("FAILED")),
    invoiceUrl: v.optional(v.string()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  }).index("by_external_id", ["externalId"]),
});
