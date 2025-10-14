import cardsData from "./tarot-cards.json" assert { type: "json" };
import { formatCardInfo, getFallbackInterpretation, toBoldFont } from "./constants";
import { api } from "./_generated/api";
import { type ActionCtx } from "./_generated/server";
import { type Doc, type Id } from "./_generated/dataModel";
import { getInterpretationModel } from "./ai/factory";

export type TarotCardData = {
  type: string;
  name_short: string;
  name: string;
  value: string;
  value_int: number;
  meaning_up: string;
  meaning_rev: string;
  desc: string;
  img: string;
};

export type DrawnCard = {
  id: string;
  name: string;
  meaning: string;
  position: string; // past / present / future
  reversed: boolean;
  description: string;
  cardType: string;
  imageUrl: string;
};

export type StoredCard = {
  id: string;
  name: string;
  meaning: string;
  position: string;
  reversed: boolean;
  description: string;
  cardType: string;
};

export type ConversationEntry = {
  type: "initial_reading" | "followup_question" | "followup_response" | "session_end";
  timestamp: number;
  content: string;
  questionNumber?: number;
  responseTime?: number;
  isValidQuestion?: boolean;
};

export async function drawThreeRandomCards(
  ctx: ActionCtx,
  prompt: string,
  userName?: string,
  userBirthdate?: string,
  emotionTone?: string,
  memoryContext?: string
): Promise<{ cards: DrawnCard[]; interpretation: string }> {
  const positions: Array<DrawnCard["position"]> = ["past", "present", "future"];

  const indices = sampleUniqueIndices(cardsData.cards.length, 3);
  const cards: DrawnCard[] = indices.map((idx, i) => {
    const raw = cardsData.cards[idx] as TarotCardData;
    const reversed = Math.random() < 0.5;
    // Use the local img field directly (URL will be constructed in http handler)
    const imageUrl = raw.img;

    return {
      id: raw.name_short,
      name: raw.name,
      meaning: reversed ? raw.meaning_rev : raw.meaning_up,
      position: positions[i]!,
      reversed,
      description: raw.desc,
      cardType: raw.type,
      imageUrl,
    };
  });

  const interpretation = await buildGeminiInterpretation(ctx, prompt, cards, userName, userBirthdate, emotionTone, memoryContext);
  return { cards, interpretation };
}

function sampleUniqueIndices(maxExclusive: number, count: number): number[] {
  const result: number[] = [];
  const taken = new Set<number>();
  while (result.length < count && taken.size < maxExclusive) {
    const idx = Math.floor(Math.random() * maxExclusive);
    if (!taken.has(idx)) {
      taken.add(idx);
      result.push(idx);
    }
  }
  return result;
}

async function buildGeminiInterpretation(
  ctx: ActionCtx,
  prompt: string,
  cards: DrawnCard[],
  userName?: string,
  userBirthdate?: string,
  emotionTone?: string,
  memoryContext?: string
): Promise<string> {
  try {
    // Use the Convex action for interpretation generation
    return await ctx.runAction(api.ai.interpretationModel.generateInterpretation, {
      prompt,
      cards: cards.map(card => ({
        name: card.name,
        meaning: card.meaning,
        position: card.position,
        reversed: card.reversed,
        description: card.description,
        cardType: card.cardType,
      })),
      userName,
      userBirthdate,
      memoryContext,
      emotionTone,
    });
  } catch (error) {
    console.error("Interpretation action error:", error);
    return buildFallbackInterpretation(prompt, cards);
  }
}

export async function generateFollowupResponse(
  ctx: ActionCtx,
  question: string,
  readingId: Id<"readings">,
  emotionTone?: string
): Promise<string> {
  try {
    // Get the reading data from database
    const reading = await ctx.runQuery(api.readings.getById, { readingId });
    if (!reading) {
      throw new Error("Reading not found");
    }

    // Use the modular interpretation model for follow-ups
    const model = getInterpretationModel();

    // Build conversation context from history
    const initialReadingContent = reading.interpretation || "";
    const recentFollowupResponses = (reading.conversationHistory || [])
      .filter((entry) => entry.type === "followup_response")
      .map((entry: ConversationEntry) => entry.content || "")
      .filter((content: string) => content.length > 0);

    const contextSummary = [initialReadingContent, ...recentFollowupResponses]
      .filter(content => content.length > 0)
      .join("\n\n");

    // Create card context summary
    const cardSummary = reading.cards.map((card: StoredCard) => formatCardInfo(card)).join("\n\n");

    // Create a specialized prompt for follow-up responses
    const followupPrompt = `${toBoldFont("Original Reading Context")}:
${contextSummary}

${toBoldFont("Cards from Original Reading")}:
${cardSummary}

${toBoldFont("Follow-up Question")}: ${question}

Provide a brief, conversational response (1-4 sentences) that addresses this specific question while connecting back to the original reading.`;

    const followupRequest = {
      prompt: followupPrompt,
      cards: reading.cards, // Include original cards for context
      userName: undefined, // Could be extracted from reading if stored
      userBirthdate: undefined,
      memoryContext: undefined, // Follow-ups already have conversation context
      emotionTone, // Use the provided emotion tone
    };

    const aiResponse = await model.generateInterpretation(followupRequest, ctx);

    // Validate response length (rough sentence count check)
    const sentenceCount = (aiResponse.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 4) {
      // Truncate to approximately 4 sentences
      const sentences = aiResponse.split(/[.!?]+/);
      return sentences.slice(0, 4).join('. ').trim() + '.';
    }

    return aiResponse || getFallbackFollowupResponse(question);

  } catch (error) {
    console.error("Error generating follow-up response:", error);
    return getFallbackFollowupResponse(question);
  }
}

export async function generateUserDescription(readings: Doc<"readings">[], userName?: string): Promise<string> {
  try {
    // Use the modular interpretation model for user descriptions
    const model = getInterpretationModel();

    const readingsSummary = readings.map((reading, index) =>
      `Reading ${index + 1}: Question: "${reading.question || 'General guidance'}"\nCards: ${reading.cards?.map((card: StoredCard) => `${card.name}${card.reversed ? ' (Reversed)' : ''}`).join(', ') || 'Unknown'}\nInterpretation: ${reading.interpretation?.substring(0, 200) || 'No interpretation'}...`
    ).join('\n\n');

    const descriptionPrompt = `Based on these recent tarot readings${userName ? ` for ${userName}` : ''}, create a brief 2-3 sentence mystical description of this person's personality and current life journey:

${readingsSummary}

Create a mystical, insightful description that captures their essence:`;

    const descriptionRequest = {
      prompt: descriptionPrompt,
      cards: [], // No specific cards for user description
      userName,
      userBirthdate: undefined,
      memoryContext: undefined,
      emotionTone: undefined,
    };

    // Create a mock ActionCtx for the interpretation model
    const mockCtx = {} as ActionCtx;

    const response = await model.generateInterpretation(descriptionRequest, mockCtx);
    return response || "A curious soul on a mystical journey of self-discovery.";

  } catch (error) {
    console.error("Error generating user description:", error);
    return "A curious soul on a mystical journey of self-discovery.";
  }
}

function buildFallbackInterpretation(prompt: string, cards: DrawnCard[]): string {
  return getFallbackInterpretation(prompt, cards);
}

function getFallbackFollowupResponse(question: string): string {
  // Simple fallback responses based on question type
  const questionLower = question.toLowerCase();

  if (questionLower.includes("why") || questionLower.includes("explain")) {
    return "The cards are showing you that sometimes the deeper meaning reveals itself through patience and reflection. Trust that the guidance is there, even when it feels unclear at first.";
  }

  if (questionLower.includes("what") || questionLower.includes("how")) {
    return "The cards suggest focusing on the practical steps you can take today. Start small, stay consistent, and watch how the energy begins to shift around you.";
  }

  if (questionLower.includes("when") || questionLower.includes("timing")) {
    return "The cards indicate that timing is about readiness, not rushing. Pay attention to the signs and synchronicities that appear - they'll show you when the moment is right.";
  }

  // Default fallback
  return "The cards are inviting you to sit with this question a bit longer. Sometimes the most profound insights come when we allow the wisdom to unfold naturally.";
}



