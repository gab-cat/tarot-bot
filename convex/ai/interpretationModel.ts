import { action, type ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { TAROT_SYSTEM_PROMPT, formatCardInfo, getFallbackInterpretation } from "../constants";

/**
 * Types for interpretation model
 */
export interface InterpretationRequest {
  prompt: string;
  cards: Array<{
    name: string;
    meaning: string;
    position: string;
    reversed: boolean;
    description: string;
    cardType: string;
  }>;
  userName?: string;
  userBirthdate?: string;
  memoryContext?: string;
  emotionTone?: string;
}

export interface InterpretationModel {
  generateInterpretation(request: InterpretationRequest, ctx: ActionCtx): Promise<string>;
}

/**
 * Default implementation using Gemini Pro for tarot interpretations.
 * Uses the existing system prompt from constants.ts.
 * See: https://ai.google.dev/gemini-api/docs/models/gemini#gemini-1.5-pro
 */
export class GeminiInterpretationModel implements InterpretationModel {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateInterpretation(request: InterpretationRequest, _ctx: ActionCtx): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn("GEMINI_API_KEY not found, falling back to simple interpretation");
      return this.buildFallbackInterpretation(request);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      const cardInfo = request.cards.map(card => formatCardInfo(card)).join("\n\n");

      // Start with base system prompt
      let systemPrompt = TAROT_SYSTEM_PROMPT;

      // Add current date
      const today = new Date();
      const currentDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      systemPrompt = systemPrompt.replace('{current_date}', currentDate);

      // Add birthdate if available
      if (request.userBirthdate) {
        systemPrompt = systemPrompt.replace('{user_birthdate}', request.userBirthdate);
      } else {
        systemPrompt = systemPrompt.replace(/\n\nUSER BIRTHDATE:.*?\./, '');
      }

      // Add emotion tone guidance if provided
      if (request.emotionTone) {
        systemPrompt += `\n\nCURRENT USER EMOTION CONTEXT: ${request.emotionTone}`;
      }

      // Add explicit guidance for referencing past readings
      systemPrompt += `

PAST READING CONTEXT GUIDANCE:
When previous readings are provided in the context, analyze if the current question relates to themes, situations, or concerns from past readings. If there are meaningful connections:

1. REFERENCE SPECIFIC PAST READINGS: Mention which past reading(s) you're drawing from and why they relate to the current question.
2. CONNECT PATTERNS: If you see recurring card themes, emotional patterns, or situational similarities, explicitly connect them.
3. PROVIDE CONTINUITY: Show how the current reading builds upon or evolves from previous insights.
4. BE SPECIFIC: Reference concrete elements like "similar to your Lovers card from October 15th" rather than vague references.

If the current question seems completely unrelated to past readings, focus on the current spread without forced connections.`;

      // Personalize with user name if available
      if (request.userName) {
        systemPrompt = systemPrompt.replace(
          "Picture this - you're curled up with your coffee",
          `Picture this - ${request.userName} is curled up with their coffee`
        );
        systemPrompt = systemPrompt.replace(
          "Think of me as that friend who always knows what to say",
          `Think of me as that friend who always knows what to say to ${request.userName}`
        );
      }

      // Build user prompt
      let userPrompt = `𝐐𝐮𝐞𝐬𝐭𝐢𝐨𝐧: ${request.prompt}

𝐂𝐚𝐫𝐝𝐬 𝐃𝐫𝐚𝐰𝐧:
${cardInfo}`;

      // Add memory context if available
      if (request.memoryContext) {
        userPrompt += `

𝐏𝐫𝐞𝐯𝐢𝐨𝐮𝐬 𝐑𝐞𝐚𝐝𝐢𝐧𝐠𝐬 𝐂𝐨𝐧𝐭𝐞𝐱𝐭:
${request.memoryContext}`;
      }

      userPrompt += `

Please provide a meaningful tarot interpretation connecting these cards${request.userName ? ` specifically for ${request.userName}` : ""}.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro", // Using Pro model for complex interpretations
        contents: systemPrompt + "\n\n" + userPrompt,
      });
      
      console.log("System Prompt:", systemPrompt);

      return response.text || this.buildFallbackInterpretation(request);
    } catch (error) {
      console.error("Gemini interpretation error:", error);
      return this.buildFallbackInterpretation(request);
    }
  }

  private buildFallbackInterpretation(request: InterpretationRequest): string {
    return getFallbackInterpretation(request.prompt, request.cards.map(card => ({
      name: card.name,
      meaning: card.meaning,
      position: card.position,
      reversed: card.reversed,
      description: card.description,
      cardType: card.cardType,
    })));
  }
}

/**
 * Action wrapper for interpretation generation.
 * Can be called from other Convex functions.
 */
export const generateInterpretation = action({
  args: {
    prompt: v.string(),
    cards: v.array(v.object({
      name: v.string(),
      meaning: v.string(),
      position: v.string(),
      reversed: v.boolean(),
      description: v.string(),
      cardType: v.string(),
    })),
    userName: v.optional(v.string()),
    userBirthdate: v.optional(v.string()),
    memoryContext: v.optional(v.string()),
    emotionTone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const model = new GeminiInterpretationModel();
    return await model.generateInterpretation(args, ctx);
  },
});
