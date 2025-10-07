import cardsData from "./tarot-cards.json" assert { type: "json" };
import { GoogleGenAI } from "@google/genai";

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

export async function drawThreeRandomCards(prompt: string): Promise<{ cards: DrawnCard[]; interpretation: string }> {
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

  const interpretation = await buildGeminiInterpretation(prompt, cards);
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

async function buildGeminiInterpretation(prompt: string, cards: DrawnCard[]): Promise<string> {
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

    const cardInfo = cards.map((card, index) => {
      const positionEmoji = index === 0 ? "⏮️" : index === 1 ? "▶️" : "⏭️";
      const positionName = index === 0 ? "Past" : index === 1 ? "Present" : "Future";

      return `${positionEmoji} ${positionName}: ${card.name}${card.reversed ? " (Reversed)" : ""}
└ Type: ${card.cardType === "major" ? "Major Arcana" : "Minor Arcana"}
└ Description: ${card.description.substring(0, 200)}...
└ Meaning: ${card.meaning}`;
    }).join("\n\n");

    const systemPrompt = `**How I roll:**
- Chatting like we're grabbing coffee and you're spilling about your week
- Connecting your past vibes, what's happening now, and what's coming up next
- Pointing out those "oh wow, that makes sense" moments that hit different
- Getting specific about real stuff - like that awkward text you sent, the job interview nerves, or why you can't stop thinking about that one person
- Keeping it relatable - relationship drama, work frustrations, creative blocks, family stuff, or that nagging feeling something's about to change
- Around 200 words of insights that actually help you navigate real life
- IMPORTANT: Keep everything under 2000 characters (emojis included)

**What you'll get:**
🎴 *Your Cards*
🔮 *The Bigger Picture* - how everything ties together
💡 *Real Talk* - the stuff you need to hear right now
🌟 *What To Try* - practical next moves that feel doable

**Make it personal:** Think about specific situations - that crush you can't stop thinking about, the project that's stressing you out, the family tension that's been building, or that gut feeling about a decision you're making. The more specific you are, the more the cards can speak directly to you.`;

    const userPrompt = `**User's Question**: ${prompt}

**Cards Drawn**:
${cardInfo}

Please provide a meaningful tarot interpretation connecting these cards.`;

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

function buildFallbackInterpretation(prompt: string, cards: DrawnCard[]): string {
  const cardSummaries = cards.map((card, index) => {
    const positionEmoji = index === 0 ? "⏮️" : index === 1 ? "▶️" : "⏭️";
    const positionName = index === 0 ? "Past" : index === 1 ? "Present" : "Future";
    const status = card.reversed ? " (Reversed)" : "";

    return `${positionEmoji} **${positionName}**: ${card.name}${status}
└─ *${card.cardType === "major" ? "Major Arcana" : "Minor Arcana"}*
└─ ${card.meaning}`;
  }).join("\n\n");

  return `🎴 **Mystical Reading**

🔮 **The Cards Reveal**: Your question "${prompt}" draws forth a fascinating journey. The ${cards[0]?.name || "first card"} speaks of foundations, while ${cards[1]?.name || "second card"} illuminates your current moment, and ${cards[2]?.name || "third card"} points toward possibilities ahead.

💡 **Whispers of Wisdom**:
• Trust the timing of your path
• Your intuition holds powerful answers
• Small steps lead to meaningful change

🌟 **Your Path Forward**: Embrace curiosity and stay open to synchronicities. The cards are your allies in this beautiful dance of life.`;
}

function lower(s: string): string {
  const t = s.trim();
  return t.length ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}


