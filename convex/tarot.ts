import cardsData from "./tarot-cards.json" assert { type: "json" };
import { GoogleGenAI } from "@google/genai";
import { TAROT_SYSTEM_PROMPT, CARD_POSITIONS, formatCardInfo, getFallbackInterpretation } from "./constants";
import { api } from "./_generated/api";
import { ActionCtx } from "./_generated/server";

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
};

export async function drawThreeRandomCards(prompt: string, userName?: string, userBirthdate?: string): Promise<{ cards: DrawnCard[]; interpretation: string }> {
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

  const interpretation = await buildGeminiInterpretation(prompt, cards, userName, userBirthdate);
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

async function buildGeminiInterpretation(prompt: string, cards: DrawnCard[], userName?: string, userBirthdate?: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn("GEMINI_API_KEY not found, falling back to simple interpretation");
    return buildFallbackInterpretation(prompt, cards);
  }

  try {
    // The client gets the API key from the environment variable `GEMINI_API_KEY`.
    const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
    });

    const cardInfo = cards.map((card, index) => formatCardInfo(card, index)).join("\n\n");

    // Personalize the system prompt with user name, current date, and birthdate if available
    let systemPrompt = TAROT_SYSTEM_PROMPT;

    // Replace current date placeholder with today's date
    const today = new Date();
    const currentDate = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    systemPrompt = systemPrompt.replace('{current_date}', currentDate);

    // Replace birthdate placeholder if available
    if (userBirthdate) {
      systemPrompt = systemPrompt.replace('{user_birthdate}', userBirthdate);
    } else {
      // If no birthdate, remove the birthdate instruction entirely
      systemPrompt = systemPrompt.replace(/\n\nUSER BIRTHDATE:.*?\./, '');
    }

    if (userName) {
      systemPrompt = systemPrompt.replace(
        "Picture this - you're curled up with your coffee",
        `Picture this - ${userName} is curled up with their coffee`
      );
      systemPrompt = systemPrompt.replace(
        "Think of me as that friend who always knows what to say",
        `Think of me as that friend who always knows what to say to ${userName}`
      );
    }

    const userPrompt = `**${userName ? userName + "'s Question" : "User's Question"}**: ${prompt}

**Cards Drawn**:
${cardInfo}

Please provide a meaningful tarot interpretation connecting these cards${userName ? ` specifically for ${userName}` : ""}.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt + "\n\n" + userPrompt,
    });

    return response.text || buildFallbackInterpretation(prompt, cards);

  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("AI interpretation temporarily unavailable. Please try your question again.");
  }
}

export async function generateFollowupResponse(
  ctx: ActionCtx,
  question: string,
  readingId: any,
  userName?: string
): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn("GEMINI_API_KEY not found, using fallback response");
    // Get reading for fallback response
    const reading = await ctx.runQuery(api.readings.getById, { readingId });
    return getFallbackFollowupResponse(question, reading?.cards || []);
  }

  try {
    // Get the reading data from database
    const reading = await ctx.runQuery(api.readings.getById, { readingId });
    if (!reading) {
      throw new Error("Reading not found");
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    // Build conversation context from history (get the initial reading interpretation)
    const initialReadingContent = reading.interpretation || "";
    const recentFollowupResponses = (reading.conversationHistory || [])
      .filter((entry) => entry.type === "followup_response")
      .map((entry: any) => entry.content || "")
      .filter((content: string) => content.length > 0);

    const contextSummary = [initialReadingContent, ...recentFollowupResponses]
      .filter(content => content.length > 0)
      .join("\n\n");

    // Create card context summary
    const cardSummary = reading.cards.map((card: any, index: number) => formatCardInfo(card, index)).join("\n\n");

    const systemPrompt = `You are a friendly tarot guide helping someone understand their reading better. Keep your responses simple, warm, and conversational - like chatting with a good friend over coffee. Limit yourself to 1-4 sentences.

Key guidelines:
- Keep it to 1-4 sentences maximum
- Talk like a friend - use "hey", "you know", "I get it", etc.
- Connect back to their original cards when it makes sense
- Answer their specific question directly but simply
- Don't use fancy tarot jargon - explain things in everyday language
- Give practical, helpful advice they can actually use
- **CRITICAL: Make responses intensely personal by mentioning specific scenarios and moments from their situation that make them feel seen and understood**
- **Always weave in references to concrete moments like "that conversation you mentioned" or "the feeling you described" to make your response feel eerily accurate and tailored just for them**
- If they're asking about something unrelated to the reading, gently bring them back: "That's interesting, but let's stick with what the cards showed us. What part of your reading are you curious about?"

Remember: You're having a casual conversation about their tarot cards, not giving a formal reading. Make each response feel like it was written specifically for their unique situation.`;

    const userPrompt = `**Original Reading Context:**
${contextSummary}

**Cards from Original Reading:**
${cardSummary}

**Follow-up Question:** ${question}

Provide a brief, conversational response (1-4 sentences) that addresses this specific question while connecting back to the original reading.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt + "\n\n" + userPrompt,
    });

    const aiResponse = response.text || getFallbackFollowupResponse(question, reading.cards);

    // Validate response length (rough sentence count check)
    const sentenceCount = (aiResponse.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 4) {
      // Truncate to approximately 4 sentences
      const sentences = aiResponse.split(/[.!?]+/);
      return sentences.slice(0, 4).join('. ').trim() + '.';
    }

    return aiResponse;

  } catch (error) {
    console.error("Error generating follow-up response:", error);
    // Get reading for fallback response
    const reading = await ctx.runQuery(api.readings.getById, { readingId });
    return getFallbackFollowupResponse(question, reading?.cards || []);
  }
}

export async function generateUserDescription(readings: any[], userName?: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return "A curious soul seeking guidance through the mystical arts.";
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    const readingsSummary = readings.map((reading, index) =>
      `Reading ${index + 1}: Question: "${reading.question || 'General guidance'}"\nCards: ${reading.cards?.map((card: any) => `${card.name}${card.reversed ? ' (Reversed)' : ''}`).join(', ') || 'Unknown'}\nInterpretation: ${reading.interpretation?.substring(0, 200) || 'No interpretation'}...`
    ).join('\n\n');

    const systemPrompt = `You are a mystical tarot reader creating a brief, insightful personality description based on someone's recent tarot readings. Write 2-3 sentences that capture their essence, current journey, and spiritual inclinations. Focus on patterns in their questions and card themes. Keep it poetic and encouraging.`;

    const userPrompt = `Based on these recent tarot readings${userName ? ` for ${userName}` : ''}, create a brief 2-3 sentence mystical description of this person's personality and current life journey:

${readingsSummary}

Create a mystical, insightful description that captures their essence:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt + "\n\n" + userPrompt,
    });

    return response.text || "A curious soul on a mystical journey of self-discovery.";

  } catch (error) {
    console.error("Error generating user description:", error);
    return "A curious soul on a mystical journey of self-discovery.";
  }
}

function buildFallbackInterpretation(prompt: string, cards: DrawnCard[]): string {
  return getFallbackInterpretation(prompt, cards);
}

function getFallbackFollowupResponse(question: string, cards: StoredCard[]): string {
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

function lower(s: string): string {
  const t = s.trim();
  return t.length ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}


