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
 * Helper function to get current PH time with full date/time info
 */
function getCurrentPHDateTime(): { date: string; time: string; dateTime: string } {
  const now = new Date();
  const phFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  const phDateTimeString = phFormatter.format(now);
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const phDate = dateFormatter.format(now);
  const timeMatch = phDateTimeString.match(/(\d{1,2}:\d{2}:\d{2}\s[AP]M)/);
  const phTime = timeMatch ? timeMatch[1] : '';
  
  return {
    date: phDate,
    time: phTime,
    dateTime: `${phDate}, ${phTime} (PH)`
  };
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

      // Get PH date and time
      const phDateTime = getCurrentPHDateTime();

      // Replace {current_date} with PH date
      systemPrompt = systemPrompt.replace('{current_date}', phDateTime.date);

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

      // Add astrological event guidance that leverages the grounding tool
      systemPrompt += `
        ASTROLOGICAL CONTEXT (USE GROUNDING SEARCH):
        You have access to a grounding tool (Google Search) - use it to check for any significant astrological events happening today in ${phDateTime.date}. Look specifically for:
        - Mercury retrograde or other planetary retrogrades
        - Lunar phases (New Moon, Full Moon, etc.)
        - Major eclipses
        - Significant planetary transits or aspects

        IMPORTANT: Only mention astrological events if they are ACTUALLY happening today or have direct relevance to the reading. Do not force astrological references. If no significant events are occurring, skip this entirely and focus purely on the cards and the user's question. Weave astrological insights naturally into the interpretation when relevant - not as a separate section.`;

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
          𝐏𝐫𝐞𝐯𝐢𝐨𝐮𝐬 𝐑𝐞𝐚𝐝𝐢𝐧𝐠𝐬 𝐂𝐨𝐧𝐭𝐞𝐱𝐭: ${request.memoryContext}`;
      }
      userPrompt += `
        Please provide a meaningful tarot interpretation connecting these cards${request.userName ? ` specifically for ${request.userName}` : ""}.
        ---
        📍 𝐑𝐞𝐚𝐝𝐢𝐧𝐠 𝐂𝐨𝐧𝐭𝐞𝐱𝐭: Today is ${phDateTime.date}, ${phDateTime.time} (Philippine Time). Use this information when searching for any relevant astrological events.`;

      const groundingTool = {
        googleSearch: {},
      };

      const outputInstructions = `
CRITICAL OUTPUT REQUIREMENTS:
1. STRICT WORD LIMIT: Your entire response MUST be under 2000 words. This is non-negotiable.
2. STRUCTURED FORMAT: Use the following structure:

🔮 **Overview** (1-2 sentences summarizing the reading's theme)

📖 **Card Insights**
- [Card Name]: Brief interpretation in context

💫 **Core Message** (The main guidance from this reading)

🌟 **Actionable Advice** (2-3 practical steps)

3. Be concise but meaningful. Quality over quantity.
4. Use emojis sparingly for visual appeal.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro", // Using Gemini 2.5 Pro for complex reasoning
        contents: userPrompt,
        config: {
          tools: [groundingTool],
          systemInstruction: systemPrompt + "\n\n" + outputInstructions,
        }
      });

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
