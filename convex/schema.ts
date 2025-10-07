import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    messengerId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    birthdate: v.optional(v.string()), // Format: "Month DD" (e.g., "Oct 15", "Dec 2")
    isSubscribed: v.boolean(),
    userType: v.string(), // "free", "mystic", "oracle"
    createdAt: v.number(),
    lastActiveAt: v.number(),
    lastReadingDate: v.optional(v.number()), // Unix timestamp for last daily reading
    sessionState: v.optional(v.string()), // "waiting_question", "reading_in_progress", "reading_complete", "waiting_birthdate", null
    description: v.optional(v.string()), // AI-generated user description
    descriptionLastUpdated: v.optional(v.number()), // Unix timestamp when description was last updated
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
    })),
    interpretation: v.string(),
    readingType: v.string(), // "daily", "question", "manual"
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  tarotCards: defineTable({
    cardId: v.string(),
    name: v.string(),
    arcana: v.string(),
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
});
