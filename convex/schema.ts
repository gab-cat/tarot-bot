import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    messengerId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    isSubscribed: v.boolean(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
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
});
