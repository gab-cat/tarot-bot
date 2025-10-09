import { action, query, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { FOLLOWUP_LIMITS, QUICK_REPLIES, toBoldFont } from "./constants";
import { type Id } from "./_generated/dataModel";

// Types for follow-up functionality
export interface ConversationEntry {
  type: "initial_reading" | "followup_question" | "followup_response" | "session_end";
  timestamp: number;
  content: string;
  questionNumber?: number;
  responseTime?: number;
  isValidQuestion?: boolean;
}

export interface FollowupSessionResult {
  sessionId: Id<"readings">;
  maxFollowups: number;
  followupsUsed: number;
  remainingQuestions: number;
  message: string;
}

export interface FollowupQuestionResult {
  response: string;
  questionNumber: number;
  remainingQuestions: number;
  responseTime: number;
  endSessionButton: boolean;
}

export interface FollowupSessionStatus {
  hasActiveSession: boolean;
  remainingQuestions: number;
  maxQuestions: number;
}

export interface ConversationHistory {
  conversationHistory: ConversationEntry[];
}

// Placeholder functions - will be implemented in Phase 2 and Phase 3
// These provide the basic module structure

export const startFollowupSession = action({
  args: {
    readingId: v.id("readings"),
    messengerId: v.string(),
  },
  handler: async (ctx, args): Promise<FollowupSessionResult> => {
    // Get the reading and user
    const reading = await ctx.runQuery(api.readings.getById, { readingId: args.readingId });
    if (!reading) {
      throw new Error("Reading not found");
    }

    if (reading.messengerId !== args.messengerId) {
      throw new Error("Unauthorized access to reading");
    }

    const user = await ctx.runQuery(api.users.getUserByMessengerId, { messengerId: args.messengerId });
    if (!user) {
      throw new Error("User not found");
    }

    // Check if follow-ups are already available or in progress
    if (reading.sessionState === "followup_available" || reading.sessionState === "followup_in_progress") {
      return {
        sessionId: args.readingId,
        maxFollowups: reading.maxFollowups,
        followupsUsed: reading.followupsUsed,
        remainingQuestions: reading.maxFollowups - reading.followupsUsed,
        message: "Follow-up session already active"
      };
    }

    // Check if session can start (reading must be completed)
    if (reading.sessionState !== "completed") {
      throw new Error("Reading must be completed before starting follow-up questions");
    }

    // Check user subscription limits
    const hasFollowupsAvailable = validateFollowupLimit(user.userType, user.followupSessionsToday || 0);
    if (!hasFollowupsAvailable) {
      throw new Error("User has reached daily follow-up session limit");
    }

    // Update reading to enable follow-ups
    const maxFollowups: number = FOLLOWUP_LIMITS[user.userType as keyof typeof FOLLOWUP_LIMITS] || 1;

    await ctx.runMutation(internal.readings.updateSessionState, {
      readingId: args.readingId,
      sessionState: "followup_available",
      maxFollowups,
      followupsUsed: 0,
      subscriptionTier: user.userType,
      lastActivityAt: Date.now(),
    });

    // Update user follow-up tracking
    await ctx.runMutation(api.users.updateFollowupTracking, {
      messengerId: args.messengerId,
      lastFollowupAt: Date.now(),
    });

    return {
      sessionId: args.readingId,
      maxFollowups,
      followupsUsed: 0,
      remainingQuestions: maxFollowups,
      message: "Follow-up session started successfully"
    };
  },
});

export const askFollowupQuestion = action({
  args: {
    readingId: v.id("readings"),
    messengerId: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args): Promise<FollowupQuestionResult> => {
    // Get the reading and user
    const reading = await ctx.runQuery(api.readings.getById, { readingId: args.readingId });
    if (!reading) {
      throw new Error("Reading not found");
    }

    if (reading.messengerId !== args.messengerId) {
      throw new Error("Unauthorized access to reading");
    }

    // Check if session is in correct state
    if (reading.sessionState !== "followup_available" && reading.sessionState !== "followup_in_progress") {
      throw new Error("Follow-up session not available");
    }

    // Check question limit
    if (reading.followupsUsed >= reading.maxFollowups) {
      throw new Error("Follow-up question limit exceeded");
    }

    // Start timing for response
    const startTime = Date.now();

    // Generate AI response
    const { generateFollowupResponse } = await import("./tarot");
    const response = await generateFollowupResponse(
      ctx,
      args.question,
      args.readingId
    );

    const responseTime = Date.now() - startTime;

    // Create conversation entries
    const questionNumber: number = reading.followupsUsed + 1;
    const questionEntry = createConversationEntry(
      "followup_question",
      args.question,
      { questionNumber, isValidQuestion: true }
    );

    const responseEntry = createConversationEntry(
      "followup_response",
      response,
      { responseTime }
    );

    // Update conversation history and counters
    const updatedHistory = addToConversationHistory(
      addToConversationHistory(reading.conversationHistory || [], questionEntry),
      responseEntry
    );

    await ctx.runMutation(internal.readings.updateAfterQuestion, {
      readingId: args.readingId,
      followupsUsed: reading.followupsUsed + 1,
      conversationHistory: updatedHistory,
      sessionState: "followup_in_progress",
      lastActivityAt: Date.now(),
    });

    // Calculate remaining questions
    const remainingQuestions = reading.maxFollowups - (reading.followupsUsed + 1);

    return {
      response,
      questionNumber,
      remainingQuestions,
      responseTime,
      endSessionButton: remainingQuestions === 0,
    };
  },
});

export const endFollowupSession = action({
  args: {
    readingId: v.id("readings"),
    messengerId: v.string(),
  },
  handler: async (ctx, args): Promise<{ message: string }> => {
    // Get the reading
    const reading = await ctx.runQuery(api.readings.getById, { readingId: args.readingId });
    if (!reading) {
      throw new Error("Reading not found");
    }

    if (reading.messengerId !== args.messengerId) {
      throw new Error("Unauthorized access to reading");
    }

    // Check if session is active
    if (reading.sessionState === "ended") {
      return { message: "Session already ended" };
    }

    // Add session end entry to conversation history
    const endEntry = createConversationEntry("session_end", "User ended the follow-up session");
    const updatedHistory = addToConversationHistory(reading.conversationHistory || [], endEntry);

    // Update reading to ended state
    await ctx.runMutation(internal.readings.updateSessionState, {
      readingId: args.readingId,
      sessionState: "ended",
      conversationHistory: updatedHistory,
      lastActivityAt: Date.now(),
    });

    // Update user tracking
    await ctx.runMutation(api.users.updateFollowupTracking, {
      messengerId: args.messengerId,
      followupSessionsToday: undefined, // Will be incremented by the mutation
    });

    return {
      message: "Thank you for exploring the cards deeper. May their wisdom continue to guide your path. 🔮✨"
    };
  },
});

export const getFollowupSessionStatus = query({
  args: {
    messengerId: v.string(),
  },
  handler: async (): Promise<FollowupSessionStatus> => {
    // TODO: Implement in Phase 2
    // Return current session status
    return {
      hasActiveSession: false,
      remainingQuestions: 0,
      maxQuestions: 0,
    };
  },
});

export const getConversationHistory = query({
  args: {
    readingId: v.id("readings"),
  },
  handler: async (): Promise<ConversationHistory> => {
    // TODO: Implement in Phase 2
    // Return conversation history for a reading
    return { conversationHistory: [] };
  },
});

// Utility functions for conversation management
export function validateFollowupLimit(userType: string, usedCount: number): boolean {
  const limit = FOLLOWUP_LIMITS[userType as keyof typeof FOLLOWUP_LIMITS] || 0;
  return usedCount < limit;
}

export function getRemainingQuestions(userType: string, usedCount: number): number {
  const limit = FOLLOWUP_LIMITS[userType as keyof typeof FOLLOWUP_LIMITS] || 0;
  return Math.max(0, limit - usedCount);
}

export function createConversationEntry(
  type: ConversationEntry["type"],
  content: string,
  options: Partial<ConversationEntry> = {}
): ConversationEntry {
  return {
    type,
    timestamp: Date.now(),
    content,
    ...options,
  };
}

// Conversation history validation and utilities
export function validateConversationHistory(history: ConversationEntry[]): boolean {
  if (!Array.isArray(history) || history.length === 0) return false;

  // Must start with initial_reading
  if (history[0]?.type !== "initial_reading") return false;

  // Must end with session_end if completed
  const lastEntry = history[history.length - 1];
  if (lastEntry?.type === "session_end") {
    // If ended, no more entries should follow
    return true;
  }

  // Chronological order validation
  for (let i = 1; i < history.length; i++) {
    if (history[i].timestamp < history[i - 1].timestamp) {
      return false;
    }
  }

  return true;
}

export function addToConversationHistory(
  history: ConversationEntry[],
  entry: ConversationEntry
): ConversationEntry[] {
  return [...history, entry];
}

export function getConversationContext(history: ConversationEntry[]): string {
  // Extract relevant context for AI prompts
  const recentEntries = history.slice(-6); // Last 6 entries for context window
  return recentEntries
    .filter(entry => entry.type !== "session_end")
    .map(entry => {
      const content = entry.content || "";
      switch (entry.type) {
        case "initial_reading":
          return `Initial Reading: ${content}`;
        case "followup_question":
          return `Question ${entry.questionNumber}: ${content}`;
        case "followup_response":
          return `Response: ${content}`;
        default:
          return content;
      }
    })
    .join("\n\n");
}

export function countQuestionsInHistory(history: ConversationEntry[]): number {
  return history.filter(entry => entry.type === "followup_question").length;
}

export function isQuestionValid(question: string): boolean {
  // Basic validation - question should be related to reading context
  const minLength = 5;
  const maxLength = 500;

  if (question.length < minLength || question.length > maxLength) {
    return false;
  }

  // Check if question contains tarot-related terms or references cards
  const tarotTerms = ["card", "reading", "past", "present", "future", "guidance", "advice"];
  const hasTarotContext = tarotTerms.some(term =>
    question.toLowerCase().includes(term)
  );

  // If no explicit tarot terms, check if it's a follow-up style question
  const followupIndicators = ["what about", "tell me more", "explain", "why", "how", "think"];
  const isFollowupStyle = followupIndicators.some(indicator =>
    question.toLowerCase().includes(indicator)
  );

  return hasTarotContext || isFollowupStyle;
}

export const autoEndFollowupSession = action({
  args: {
    readingId: v.id("readings"),
    messengerId: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<void> => {
    try {
      // Check if the session is still active
      const reading = await ctx.runQuery(api.readings.getById, { readingId: args.readingId });
      if (!reading || reading.sessionState !== "followup_available" && reading.sessionState !== "followup_in_progress") {
        // Session already ended or not in followup state
        return;
      }

      // End the followup session
      await ctx.runAction(api.followups.endFollowupSession, {
        readingId: args.readingId,
        messengerId: args.messengerId
      });

      // Send Start Reading button
      const accessToken = process.env.ACCESS_TOKEN;
      if (accessToken) {
        const url = `https://graph.facebook.com/v23.0/me/messages?access_token=${encodeURIComponent(accessToken)}`;
        const messageData = {
          recipient: { id: args.messengerId },
          messaging_type: "RESPONSE",
          message: {
            text: `⏰ ${toBoldFont("Your 10-minute follow-up window has ended")} ✨\n\nReady for your next mystical journey? 🔮`,
            quick_replies: [{
              content_type: "text",
              title: QUICK_REPLIES.start.title,
              payload: QUICK_REPLIES.start.payload
            }]
          },
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messageData),
        });

        if (!response.ok) {
          console.error("Failed to send auto-end message:", response.status, await response.text());
        }
      }
    } catch (error) {
      console.error("Error in autoEndFollowupSession:", error);
    }
  },
});
