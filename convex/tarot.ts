import cardsData from "./tarot-cards.json" assert { type: "json" };
import { GoogleGenAI } from "@google/genai";
import { TAROT_SYSTEM_PROMPT, CARD_POSITIONS, formatCardInfo, getFallbackInterpretation } from "./constants";

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

function lower(s: string): string {
  const t = s.trim();
  return t.length ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}


